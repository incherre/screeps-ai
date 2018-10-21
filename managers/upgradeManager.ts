import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { UpgradeJob } from "../jobs/upgradeJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class UpgradeManager extends Manager {
    public static type = 'upgrade';

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const upgradeNumber = 2;
        for(let i = this.workers.length; i < upgradeNumber; i++){
            requests.push(new SpawnRequest(UpgradeManager.type, 'worker'));
        }
        for(const i in this.workers) {
            const ttl = this.workers[i].creep.ticksToLive;
            if(ttl && ttl < 50) {
                requests.push(new SpawnRequest(UpgradeManager.type, 'worker'));
            }
            else if(this.workers[i].creep.carry.energy < this.workers[i].creep.carryCapacity) {
                requests.push(new DropoffRequest(UpgradeManager.type, this.workers[i].creep));
            }
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