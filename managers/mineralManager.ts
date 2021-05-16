import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { creepNearDeath } from "../misc/helperFunctions";
import { DropoffRequest } from "../requests/dropoffRequest";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SellRequest } from "../requests/sellRequst";
import { SpawnRequest } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class MineralManager extends Manager {
    // static parameters
    public static type: string = 'mineral';
    public static mineralRCL: number = 6;
    public static pickupThreshold: number = 500;
    public static storageAmount: number = 10000;
    public static terminalAmount: number = 5000;

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];

        if(this.parent.capital.controller && this.parent.capital.controller.level >= MineralManager.mineralRCL) {
            const mineNumber = 1;
            let actualNumber = this.workers.length;

            for(const worker of this.workers) {
                if(!worker.creep || creepNearDeath(worker.creep, this.parent.capital.name)) {
                    actualNumber--;
                }
            }

            for(let i = actualNumber; i < mineNumber; i++){
                requests.push(new SpawnRequest(MineralManager.type, this.parent.capitalName, 'miner'));
            }

            const mineral = _.find(this.parent.capital.find(FIND_MINERALS));
            if(mineral) {
                const container = _.find(mineral.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (struct) => struct.structureType === STRUCTURE_CONTAINER
                }));
                if(container instanceof StructureContainer && container.store.getUsedCapacity() > MineralManager.pickupThreshold) {
                    for(const mineralType of Object.keys(container.store) as ResourceConstant[]) {
                        const amount = container.store[mineralType];
                        if(amount && amount > 0) {
                            requests.push(new PickupRequest(MineralManager.type, this.parent.capitalName, container, container.store[mineralType], mineralType));
                        }
                    }
                }

                if(this.parent.capital.storage && this.parent.capital.terminal) {
                    const terminal = this.parent.capital.terminal;
                    const storage = this.parent.capital.storage;
                    let amount: number | undefined;

                    amount = terminal.store.getUsedCapacity() - terminal.store.energy
                    if(terminal.store.energy < amount * 2) {
                        requests.push(new DropoffRequest(MineralManager.type, this.parent.capitalName, this.parent.capital.terminal, (amount * 2) - terminal.store.energy));
                    }

                    amount = storage.store[mineral.mineralType];
                    if(amount && amount > MineralManager.storageAmount) {
                        requests.push(new DropoffRequest(MineralManager.type, this.parent.capitalName, this.parent.capital.terminal,
                            amount - MineralManager.storageAmount, mineral.mineralType));
                    }

                    amount = terminal.store[mineral.mineralType];
                    if(amount && amount > MineralManager.terminalAmount) {
                        requests.push(new SellRequest(this.parent.capital.name, amount, mineral.mineralType));
                    }
                }
            }
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital || !this.parent.capital.controller || this.parent.capital.controller.level < MineralManager.mineralRCL) {
            return;
        }

        const mineral = _.find(this.parent.capital.find(FIND_MINERALS));
        if(mineral && this.parent.structures.get(STRUCTURE_EXTRACTOR)) {
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
