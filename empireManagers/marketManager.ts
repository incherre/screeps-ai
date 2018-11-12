import { Empire } from "../empire";
import { EmpireRequest } from "../requests/empireRequest";
import { SellRequest } from "../requests/sellRequst";
import { EmpireManager } from "./empireManager";

import { profile } from "../Profiler/Profiler";

@profile
export class MarketManager extends EmpireManager {
    public static maxPriceEntries = 200;
    public static shortTerm = 50;
    public static decayRate = 0.95;
    public static recordFrequency = 10;

    public static type = 'market';
    public static dealLimit = 10;

    public dealsThisTick: number;

    constructor(parent: Empire) {
        super(parent);
        this.dealsThisTick = 0;
    }

    public generateRequests(): EmpireRequest[] {
        return [];
    }

    public manage(): void {
        if(Game.time % MarketManager.recordFrequency === 0) {
            this.recordMarketData();
        }

        const sellRequests = this.parent.requests.get(SellRequest.type);
        if(sellRequests) {
            for(const request of sellRequests) {
                if(this.dealsThisTick >= MarketManager.dealLimit) {
                    break;
                }

                if(request instanceof SellRequest) {
                    const bestOrder = _.max(Game.market.getAllOrders({type: ORDER_BUY, resourceType: request.resourceType}), (order) => order.price);
                    let threshold = 0;
                    if(Memory.marketHistory && Memory.marketHistory[request.resourceType] && Memory.marketHistory[request.resourceType].length > MarketManager.shortTerm) {
                        // only do the fancy trading once there's enough data for it
                        const longTermAverage = _.sum(Memory.marketHistory[request.resourceType]) / Memory.marketHistory[request.resourceType].length;
                        const shortTermAverage = _.sum(Memory.marketHistory[request.resourceType].slice(0, MarketManager.shortTerm)) / MarketManager.shortTerm;
                        
                        if(shortTermAverage >= longTermAverage) {
                            // if we are in a temporary upward fluctuation, sell
                            threshold = (longTermAverage + shortTermAverage) / 2;
                        }
                        else {
                            // if we are in a temporary downward fluctuation, don't sell
                            threshold = Infinity;
                        }
                    }

                    if(bestOrder.price >= threshold) {
                        // if the price is good enough, sell!
                        const retVal = Game.market.deal(bestOrder.id, Math.min(request.amount, bestOrder.amount), request.roomName);
                        if(retVal === OK) {
                            this.dealsThisTick++;
                        }
                    }
                }
            }
        }
    }

    private recordMarketData(): void {
        if(!Memory.marketHistory) {
            Memory.marketHistory = {};
        }

        // first, get all the minerals we should keep track of
        const mineralsOfInterest = new Set<MineralConstant>();
        for(const roomName in this.parent.colonies) {
            const room = this.parent.colonies[roomName].capital;
            const mineral = _.find(room.find(FIND_MINERALS));

            if(mineral) {
                mineralsOfInterest.add(mineral.mineralType);
            }
        }

        // next get the max valued buy order for each, and keep track of that
        for(const mineral of mineralsOfInterest.values()) {
            const bestOrder = _.max(Game.market.getAllOrders({type: ORDER_BUY, resourceType: mineral}), (order) => order.price);

            if(!Memory.marketHistory[mineral]) {
                Memory.marketHistory[mineral] = [];
            }

            if((bestOrder as Order).id) {
                // record the history
                Memory.marketHistory[mineral].unshift(bestOrder.price);
            }
            else if(Memory.marketHistory[mineral].length > 0) {
                // if nobody is buying, record the last seen best price, but adjusted down a bit
                Memory.marketHistory[mineral].unshift(Memory.marketHistory[mineral][0] * MarketManager.decayRate);
            }
            else {
                // if you've never seen anyone buying, treat it as if it's worthless
                Memory.marketHistory[mineral].unshift(0);
            }

            if(Memory.marketHistory[mineral].length > MarketManager.maxPriceEntries) {
                // keep the length under the specified max length
                Memory.marketHistory[mineral].pop();
            }
        }
    }
}
