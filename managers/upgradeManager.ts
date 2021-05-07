import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { UpgradeJob } from "../jobs/upgradeJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class UpgradeManager extends Manager {
    // static parameters
    public static type = 'upgrade';
    public static refillRatio = 0.5;
    public static capacityConstant = .3;

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];
        let upgradeNumber = 1;
        if(this.parent.capital.controller && this.parent.capital.controller.level <= 4) {
            let sourceCount = this.parent.capital.find(FIND_SOURCES).length;
            let energyFromSourcesPerTick = (SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME) * sourceCount;

            let bodyIterCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
            let maxSpawningEnergy = (this.parent.structures.get(STRUCTURE_SPAWN) || []).length * SPAWN_ENERGY_CAPACITY +
                (this.parent.structures.get(STRUCTURE_EXTENSION) || []).length * EXTENSION_ENERGY_CAPACITY[this.parent.capital.controller.level];
            let maxBodyIters = Math.floor(maxSpawningEnergy / bodyIterCost);
            let maxBodyItersCost = maxBodyIters * bodyIterCost;

            // Note, this assumes that upgradeController() uses one energy per tick per work part.
            let creepsRequiredToUseAllEnergy = Math.floor(energyFromSourcesPerTick / (maxBodyIters + (maxBodyItersCost / CREEP_LIFE_TIME)));

            // Don't make more than 8 upgraders. With default server settings, this would only happen at RCL 1 anyway.
            upgradeNumber = Math.min(creepsRequiredToUseAllEnergy, 8);
        }
        else if(this.parent.capital.storage) {
            const upperCapacityConstant = Math.min(1 - ((1 - UpgradeManager.capacityConstant) / 2), UpgradeManager.capacityConstant * 2);
            if(this.parent.capital.storage.store[RESOURCE_ENERGY] > (this.parent.capital.storage.store.getCapacity() * upperCapacityConstant)) {
                upgradeNumber = 3;
            }
            else if(this.parent.capital.storage.store[RESOURCE_ENERGY] > (this.parent.capital.storage.store.getCapacity() * UpgradeManager.capacityConstant)) {
                upgradeNumber = 2;
            }
        }

        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            if(!worker.creep) {
                continue;
            }

            const ttl = worker.creep.ticksToLive;
            if(ttl && ttl < 50) {
                actualNumber--;
            }
            else if(worker.creep.store.energy < UpgradeManager.refillRatio * worker.creep.store.getCapacity()) {
                requests.push(new DropoffRequest(UpgradeManager.type, worker.creep, worker.creep.store.getFreeCapacity()));
            }
        }

        if(actualNumber === 0) {
            requests.push(new SpawnRequest(UpgradeManager.type, 'worker', /*priority=*/2));
            actualNumber++;
        }

        for(let i = actualNumber; i < upgradeNumber; i++){
            requests.push(new SpawnRequest(UpgradeManager.type, 'worker'));
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        for(const i in this.workers) {
            if(this.workers[i].job instanceof IdleJob && this.parent.capital.controller) {
                this.workers[i].job = new UpgradeJob(this.parent.capital.controller);
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
