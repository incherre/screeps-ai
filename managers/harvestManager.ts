import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class HarvestManager extends Manager {
    public static type = 'harvest';

    private creepNearDeath(creep: Creep): boolean {
        const ticksPerStep = Math.ceil(creep.body.length / (creep.getActiveBodyparts(MOVE) * 2));
        const spawnTime = CREEP_SPAWN_TIME * creep.body.length;
        const walkDistanceEstimate = (Game.map.getRoomLinearDistance(creep.pos.roomName, this.parent.capital.name) + 0.5) * 50;
        const walkTime = ticksPerStep * walkDistanceEstimate;

        if(creep.ticksToLive && creep.ticksToLive < (spawnTime + walkTime)) {
            const nearestSpawn  = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if(nearestSpawn && creep.ticksToLive <= (spawnTime + (creep.pos.getRangeTo(nearestSpawn) * ticksPerStep))) {
                return true;
            }
            else if(!nearestSpawn) {
                return true;
            }
        }

        return false;
    }

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];

        let harvestNumber = this.parent.capital.find(FIND_SOURCES).length;

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.farms) {
                if(Game.rooms[roomName]) {
                    harvestNumber += Game.rooms[roomName].find(FIND_SOURCES).length;
                }
                else {
                    // TODO(Daniel): Request visibility from exploration manager
                }
            }
        }
        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            if(this.creepNearDeath(worker.creep)) {
                actualNumber--;
            }
        }

        for(let i = actualNumber; i < harvestNumber; i++){
            requests.push(new SpawnRequest(HarvestManager.type, 'harvester'));
        }

        return requests;
    }

    public manage(): void {
        const unpairedSources: Set<string> = new Set<string>();
        const sources: Source[] = this.parent.capital.find(FIND_SOURCES);
        for(const source of sources) {
            unpairedSources.add(source.id);
        }

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.farms) {
                if(Game.rooms[roomName]) {
                    const roomSources  = Game.rooms[roomName].find(FIND_SOURCES);
                    for(const source of roomSources) {
                        unpairedSources.add(source.id);
                    }
                }
            }
        }

        const idleWorkers: WorkerCreep[] = [];
    
        for(const i in this.workers) {
            if(this.workers[i].job instanceof IdleJob) {
                idleWorkers.push(this.workers[i]);
            }
            else if(this.workers[i].job instanceof HarvestJob) {
                const sourceId = (this.workers[i].job as HarvestJob).sourceId;
                if(!this.creepNearDeath(this.workers[i].creep) && sourceId) {
                    unpairedSources.delete(sourceId);
                }
            }
        }

        for(const sourceId of unpairedSources.values()) {
            if(idleWorkers.length > 0) {
                const worker = idleWorkers.pop();
                const source = Game.getObjectById(sourceId);
                if(worker && source instanceof Source) {
                    worker.job = new HarvestJob(source);
                }
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