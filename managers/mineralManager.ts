import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { creepNearDeath } from "../misc/helperFunctions";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { Manager } from "./manager";

import { profile } from "../Profiler/Profiler";

@profile
export class MineralManager extends Manager {
    public static type: string = 'mineral';
    public static mineralRCL: number = 6;
    public static pickupThreshold: number = 500;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];

        if(this.parent.capital.controller && this.parent.capital.controller.level >= MineralManager.mineralRCL) {
            const mineNumber = 1;
            let actualNumber = this.workers.length;

            for(const worker of this.workers) {
                if(creepNearDeath(worker.creep, this.parent.capital.name)) {
                    actualNumber--;
                }
            }

            for(let i = actualNumber; i < mineNumber; i++){
                requests.push(new SpawnRequest(MineralManager.type, spawnTypes.miner));
            }

            const mineral = _.find(this.parent.capital.find(FIND_MINERALS));
            if(mineral) {
                const container = _.find(mineral.pos.findInRange(FIND_STRUCTURES, 1, {filter: (struct) => struct.structureType === STRUCTURE_CONTAINER}));
                if(container instanceof StructureContainer && _.sum(container.store) > MineralManager.pickupThreshold) {
                    for(const mineralType of Object.keys(container.store)) {
                        const amount = container.store[mineralType as ResourceConstant];
                        if(amount && amount > 0) {
                            requests.push(new PickupRequest(MineralManager.type, container, mineralType as ResourceConstant));
                        }
                    }
                }
            }
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital.controller || this.parent.capital.controller.level < MineralManager.mineralRCL) {
            return;
        }

        const mineral = _.find(this.parent.capital.find(FIND_MINERALS));
        if(mineral) {
            for(const worker of this.workers) {
                if(worker.job instanceof IdleJob) {
                    worker.job = new HarvestJob(mineral);
                }
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
