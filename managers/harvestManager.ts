import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class HarvestManager extends Manager {
    public static type = 'harvest';

    private static creepNearDeath(creep: Creep): boolean {
        const walkTime = 4;
        const maxRoomDistance = 50;
        if(creep.ticksToLive < (walkTime * maxRoomDistance)) {
            const nearestSpawn  = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if(creep.ticksToLive <= creep.pos.getRangeTo(nearestSpawn)) {
                return true;
            }
        }

        return false;
    }

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const harvestNumber = this.parent.capital.find(FIND_SOURCES).length;
        for(let i = this.workers.length; i < harvestNumber; i++){
            requests.push(new SpawnRequest(HarvestManager.type, 'harvester'));
        }
        for(const i in this.workers) {
            if(HarvestManager.creepNearDeath(this.workers[i].creep)) {
                requests.push(new SpawnRequest(HarvestManager.type, 'harvester'));
            }
        }
        return requests;
    }

    public manage(): void {
        const unpairedSources: Set<string> = new Set<string>();
        const sources: Source[] = this.parent.capital.find(FIND_SOURCES);

        for(const i in sources) {
            unpairedSources.add(sources[i].id);
        }

        const idleWorkers: WorkerCreep[] = [];
    
        for(const i in this.workers) {
            if(this.workers[i].job instanceof IdleJob) {
                idleWorkers.push(this.workers[i]);
            }
            else if(this.workers[i].job instanceof HarvestJob && (this.workers[i].job as HarvestJob).source) {
                const sourceId = (this.workers[i].job as HarvestJob).source.id;
                if(!HarvestManager.creepNearDeath(this.workers[i].creep)) {
                    unpairedSources.delete(sourceId);
                }
            }
        }

        for(const sourceId in unpairedSources) {
            if(idleWorkers.length > 0) {
                const worker = idleWorkers.pop();
                worker.job =  new HarvestJob(Game.getObjectById(sourceId));
            }
            else {
                break;
            }
        }

        for(const i in this.workers) {
            this.workers[i].work();
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}