import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { UpgradeJob } from "../jobs/upgradeJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class UpgradeManager extends Manager {
    public static type = 'upgrade';
    public static refillRatio = 0.5;
    public static capacityConstant = .3;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        let upgradeNumber = 1;
        if(this.parent.capital.controller && this.parent.capital.controller.level <= 4) {
            upgradeNumber = this.parent.capital.controller.level;
        }
        else if(this.parent.capital.storage) {
            const upperCapacityConstant = Math.min(1 - ((1 - UpgradeManager.capacityConstant) / 2), UpgradeManager.capacityConstant * 2);
            if(this.parent.capital.storage.store[RESOURCE_ENERGY] > (this.parent.capital.storage.storeCapacity * upperCapacityConstant)) {
                upgradeNumber = 3;
            }
            else if(this.parent.capital.storage.store[RESOURCE_ENERGY] > (this.parent.capital.storage.storeCapacity * UpgradeManager.capacityConstant)) {
                upgradeNumber = 2;
            }
        }

        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            const ttl = worker.creep.ticksToLive;
            if(ttl && ttl < 50) {
                actualNumber--;
            }
            else if(worker.creep.carry.energy < UpgradeManager.refillRatio * worker.creep.carryCapacity) {
                requests.push(new DropoffRequest(UpgradeManager.type, worker.creep));
            }
        }

        if(actualNumber === 0) {
            requests.push(new SpawnRequest(UpgradeManager.type, spawnTypes.worker, 2));  // see request.ts for priority meanings
            actualNumber++;
        }

        for(let i = actualNumber; i < upgradeNumber; i++){
            requests.push(new SpawnRequest(UpgradeManager.type, spawnTypes.worker));
        }

        return requests;
    }

    public manage(): void {
        for(const i in this.workers) {
            if(this.workers[i].job instanceof IdleJob && this.parent.capital.controller) {
                this.workers[i].job = new UpgradeJob(this.parent.capital.controller);
            }
            this.workers[i].work();
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
