import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { UpgradeJob } from "../jobs/upgradeJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class UpgradeManager extends Manager {
    public static type = 'upgrade';
    public static refillRatio = 0.5;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const upgradeNumber = 2 + this.parent.capital.find(FIND_DROPPED_RESOURCES, {filter: (reso) => reso.resourceType === RESOURCE_ENERGY && reso.amount > 50}).length;
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

        for(let i = actualNumber; i < upgradeNumber; i++){
            requests.push(new SpawnRequest(UpgradeManager.type, 'worker'));
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