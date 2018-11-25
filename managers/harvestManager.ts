import { Colony } from "../colony";
import { HarvestJob } from "../jobs/harvestJob";
import { IdleJob } from "../jobs/idleJob";
import { ReserveJob } from "../jobs/reserveJob";
import { creepNearDeath } from "../misc/helperFunctions";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { VisionRequest } from "../requests/visionRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

import { profile } from "../Profiler/Profiler";

@profile
export class HarvestManager extends Manager {
    // static parameters
    public static type = 'harvest';
    public static reserveMargin = 600;
    public static minCont = 150;
    public static minReso = 50;

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const storage = this.parent.capital.storage;
        const requests: ScreepsRequest[] = [];

        let sources = this.parent.capital.find(FIND_SOURCES);
        let reserveNumber = 0;

        if(storage) {
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length === 0) {
                    sources = sources.concat(Game.rooms[roomName].find(FIND_SOURCES));
                    const controller = Game.rooms[roomName].controller;
                    if(controller && (!controller.reservation || controller.reservation.ticksToEnd <= (CONTROLLER_RESERVE_MAX - HarvestManager.reserveMargin))) {
                        reserveNumber++;
                    }
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
            (reso) => (reso.resourceType === RESOURCE_ENERGY && reso.amount > HarvestManager.minReso) ||
            (reso.resourceType !== RESOURCE_ENERGY && storage)
        });
        for(const resource of droppedResources) {
            requests.push(new PickupRequest(HarvestManager.type, resource, resource.resourceType));
        }

        const tombstones = this.parent.capital.find(FIND_TOMBSTONES, {filter:
            (stone) => (stone.store.energy > HarvestManager.minReso) || (Object.keys(stone.store).length > 1 && storage)
        });
        for(const tombstone of tombstones) {
            for(const resource of Object.keys(tombstone.store)) {
                if(resource === RESOURCE_ENERGY && tombstone.store.energy > HarvestManager.minReso) {
                    requests.push(new PickupRequest(HarvestManager.type, tombstone));
                }
                else if(storage) {
                    requests.push(new PickupRequest(HarvestManager.type, tombstone, resource as ResourceConstant));
                }
            }
        }

        const harvestNumber = sources.length;
        let workNumber = 0;
        let claimNumber = 0;

        for(const worker of this.workers) {
            if(worker.creep && !creepNearDeath(worker.creep, this.parent.capital.name)) {
                if(worker.creep.getActiveBodyparts(WORK) > 0) {
                    workNumber++;
                }
                else if(worker.creep.getActiveBodyparts(CLAIM) > 0) {
                    claimNumber++;
                }
            }
        }

        if(workNumber === 0) {
            requests.push(new SpawnRequest(HarvestManager.type, spawnTypes.harvester, 0));  // see request.ts for priority meanings
            workNumber++;
        }

        for(let i = workNumber; i < harvestNumber; i++){
            requests.push(new SpawnRequest(HarvestManager.type, spawnTypes.harvester, 2));  // see request.ts for priority meanings
        }

        for(let i = claimNumber; i < reserveNumber; i++){
            requests.push(new SpawnRequest(HarvestManager.type, spawnTypes.claimer, 2));  // see request.ts for priority meanings
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        const unpairedSources: Set<string> = new Set<string>();
        const unpairedRooms: Set<string> = new Set<string>();
        const sources: Source[] = this.parent.capital.find(FIND_SOURCES);
        for(const source of sources) {
            unpairedSources.add(source.id);
        }

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName]) {
                    const roomSources  = Game.rooms[roomName].find(FIND_SOURCES);
                    for(const source of roomSources) {
                        unpairedSources.add(source.id);
                    }

                    const controller = Game.rooms[roomName].controller;
                    if(controller && (!controller.reservation || controller.reservation.ticksToEnd <= (CONTROLLER_RESERVE_MAX - HarvestManager.reserveMargin))) {
                        unpairedRooms.add(roomName);
                    }
                }
            }
        }

        const idleHarvesters: WorkerCreep[] = [];
        const idleReservers: WorkerCreep[] = [];
    
        for(const worker of this.workers) {
            if(!worker.creep) {
                continue;
            }
            
            if(worker.job instanceof IdleJob) {
                if(worker.creep.getActiveBodyparts(WORK) > 0) {
                    idleHarvesters.push(worker);
                }
                else if(worker.creep.getActiveBodyparts(CLAIM) > 0) {
                    idleReservers.push(worker);
                }
            }
            else if(worker.job instanceof HarvestJob) {
                const sourceId = (worker.job as HarvestJob).sourceId;
                if(!creepNearDeath(worker.creep, this.parent.capital.name) && sourceId) {
                    unpairedSources.delete(sourceId);
                }
            }
            else if(worker.job instanceof ReserveJob) {
                const roomName = (worker.job as ReserveJob).roomName;
                if(!creepNearDeath(worker.creep, this.parent.capital.name) && roomName) {
                    unpairedRooms.delete(roomName);
                }
            }
        }

        for(const sourceId of unpairedSources.values()) {
            if(idleHarvesters.length > 0) {
                const worker = idleHarvesters.pop();
                const source = Game.getObjectById(sourceId);
                if(worker && source instanceof Source) {
                    worker.job = new HarvestJob(source);
                }
            }
            else {
                break;
            }
        }

        for(const roomName of unpairedRooms.values()) {
            if(idleReservers.length > 0) {
                const worker = idleReservers.pop();
                if(worker) {
                    worker.job = new ReserveJob(roomName);
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
