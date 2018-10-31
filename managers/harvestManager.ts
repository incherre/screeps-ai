import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class HarvestManager extends Manager {
    public static type = 'harvest';
    public static minCont = 150;
    public static minReso = 50;

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

        let sources = this.parent.capital.find(FIND_SOURCES);

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.farms) {
                if(Game.rooms[roomName]) {
                    sources = sources.concat(Game.rooms[roomName].find(FIND_SOURCES));
                }
                else {
                    // TODO(Daniel): Request visibility from exploration manager
                }
            }
        }

        for(const source of sources) {
            for(const resource of source.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: (res) => res.amount > HarvestManager.minReso})) {
                requests.push(new PickupRequest(HarvestManager.type, resource, resource.resourceType))
            }

            for(const container of source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (struct) => struct.structureType === STRUCTURE_CONTAINER && struct.store.energy > HarvestManager.minCont})) {
                requests.push(new PickupRequest(HarvestManager.type, container))
            }
        }

        const harvestNumber = sources.length;
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