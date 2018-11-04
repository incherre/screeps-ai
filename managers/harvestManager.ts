import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { VisionRequest } from "../requests/visionRequest";
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
                if(Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length === 0) {
                    sources = sources.concat(Game.rooms[roomName].find(FIND_SOURCES));
                }
                else if(!Game.rooms[roomName]) {
                    requests.push(new VisionRequest(HarvestManager.type, roomName));
                }
            }
        }

        for(const source of sources) {
            if(source.pos.roomName !== this.parent.capital.name) {
                for(const resource of source.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: (res) => res.amount > HarvestManager.minReso})) {
                    requests.push(new PickupRequest(HarvestManager.type, resource, resource.resourceType))
                }
            }

            for(const container of source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (struct) => struct.structureType === STRUCTURE_CONTAINER && struct.store.energy > HarvestManager.minCont})) {
                requests.push(new PickupRequest(HarvestManager.type, container))
            }
        }

        const droppedResources = this.parent.capital.find(FIND_DROPPED_RESOURCES, {filter:
            (reso) => (reso.resourceType === RESOURCE_ENERGY && reso.amount > HarvestManager.minReso) || (reso.resourceType !== RESOURCE_ENERGY && this.parent.capital.storage)
        });
        for(const resource of droppedResources) {
            requests.push(new PickupRequest(HarvestManager.type, resource, resource.resourceType));
        }

        const tombstones = this.parent.capital.find(FIND_TOMBSTONES, {filter:
            (stone) => (stone.store.energy > HarvestManager.minReso) || (Object.keys(stone.store).length > 1 && this.parent.capital.storage)
        });
        for(const tombstone of tombstones) {
            for(const resource of Object.keys(tombstone.store)) {
                if(resource === RESOURCE_ENERGY && tombstone.store.energy > HarvestManager.minReso) {
                    requests.push(new PickupRequest(HarvestManager.type, tombstone));
                }
                else if(this.parent.capital.storage) {
                    requests.push(new PickupRequest(HarvestManager.type, tombstone, resource as ResourceConstant));
                }
            }
        }

        const harvestNumber = sources.length;
        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            if(this.creepNearDeath(worker.creep)) {
                actualNumber--;
            }
        }

        if(actualNumber === 0) {
            requests.push(new SpawnRequest(HarvestManager.type, spawnTypes.harvester, 0));  // see request.ts for priority meanings
            actualNumber++;
        }

        for(let i = actualNumber; i < harvestNumber; i++){
            requests.push(new SpawnRequest(HarvestManager.type, spawnTypes.harvester, 2));  // see request.ts for priority meanings
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
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
