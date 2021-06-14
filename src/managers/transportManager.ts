import { Colony } from "../colony";
import { DropoffJob } from "../jobs/dropoffJob";
import { IdleJob } from "../jobs/idleJob";
import { PickupJob } from "../jobs/pickupJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class TransportManager extends Manager {
    // static parameters
    public static type = 'transport';

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];
        let transportNumber = 0;
        if(this.parent.capital.storage) {
            transportNumber = 1 + this.parent.capital.find(FIND_SOURCES).length;
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName]) {
                    transportNumber += 1 + Game.rooms[roomName].find(FIND_SOURCES).length;
                }
            }
        }
        else if (this.parent.capital.controller) {
            let sourceCount = this.parent.capital.find(FIND_SOURCES).length;
            let energyFromSourcesPerTick = (SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME) * sourceCount;

            let bodyIterCost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
            let maxSpawningEnergy = (this.parent.structures.get(STRUCTURE_SPAWN) || []).length * SPAWN_ENERGY_CAPACITY +
                (this.parent.structures.get(STRUCTURE_EXTENSION) || []).length * EXTENSION_ENERGY_CAPACITY[this.parent.capital.controller.level];
            let maxBodyIters = Math.floor(maxSpawningEnergy / bodyIterCost);
            let maxBodyItersCost = maxBodyIters * bodyIterCost;

            // Note, this assumes that the average path length of a carrier is 25, and we have to go there and back.
            let energyTransportedPerTickPerPart = CARRY_CAPACITY / (25 * 2);
            let creepsRequiredToMoveAllEnergy = Math.ceil(energyFromSourcesPerTick / ((energyTransportedPerTickPerPart * maxBodyIters) + (maxBodyItersCost / CREEP_LIFE_TIME)));

            transportNumber = creepsRequiredToMoveAllEnergy;
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
        }

        if(actualNumber === 0) {
            requests.push(new SpawnRequest(TransportManager.type, this.parent.capitalName, 'carrier', /*priority=*/0));
            actualNumber++;
        }

        if(actualNumber === 1) {
            requests.push(new SpawnRequest(TransportManager.type, this.parent.capitalName, 'carrier', /*priority=*/1));
            actualNumber++;
        }

        for(let i = actualNumber; i < transportNumber; i++) {
            requests.push(new SpawnRequest(TransportManager.type, this.parent.capitalName, 'carrier', /*priority=*/2));
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        // Map of (id,resourceType) pairs to a request
        const containerRequestsMap: Map<string, DropoffRequest | PickupRequest> = new Map<string, DropoffRequest | PickupRequest>();

        const idleCreeps: WorkerCreep[] = [];
        const mineralsSoonAvailable: Set<ResourceConstant> = new Set<ResourceConstant>();

        // Consider other managers requesting stuff
        const dropoffRequests: ScreepsRequest[] | undefined = this.parent.requests.get(DropoffRequest.type);
        if(dropoffRequests) {
            for(const request of dropoffRequests as DropoffRequest[]) {
                containerRequestsMap.set([request.container.id, request.resourceType].join(), request);
            }
        }

        // Consider other managers giving stuff
        const pickupRequests: ScreepsRequest[] | undefined = this.parent.requests.get(PickupRequest.type);
        if(pickupRequests) {
            for(const request of pickupRequests as PickupRequest[]) {
                containerRequestsMap.set([request.container.id, request.resourceType].join(), request);
            }
        }

        // Use the information about creeps to find creeps in need of work, and remove some requests
        for(const worker of this.workers) {
            if(!worker.creep) {
                continue;
            }

            if(worker.job instanceof IdleJob) {
                idleCreeps.push(worker);
                for(const resource of Object.keys(worker.creep.store)) {
                    mineralsSoonAvailable.add(resource as ResourceConstant);
                }
            }
            else if(worker.job instanceof PickupJob) {
                // the resource is being gotten
                const container = (worker.job as PickupJob).container;
                const resourceType = (worker.job as PickupJob).resourceType;
                if(container) {
                    containerRequestsMap.delete([container.id, resourceType].join());
                    mineralsSoonAvailable.add(resourceType);
                }
            }
            else if(worker.job instanceof DropoffJob) {
                // the resource is being delivered
                const container = (worker.job as DropoffJob).container;
                const resourceType = (worker.job as DropoffJob).resourceType;
                if(container) {
                    containerRequestsMap.delete([container.id, resourceType].join());
                }
            }
        }

        // Build a list of requests instead of the map
        const containerRequests: (DropoffRequest | PickupRequest)[] = [];
        for(const key of containerRequestsMap.keys()) {
            const resourceType = key.split(',')[1] as ResourceConstant;
            const request = containerRequestsMap.get(key);
            if(!request) {
                continue;
            }

            if(!(request instanceof DropoffRequest) || mineralsSoonAvailable.has(resourceType)) {
                containerRequests.push(request)
                continue;
            }

            // If someone is requesting something, but it isn't in a creep already, try to pick it up
            if(this.parent.capital.storage && this.parent.capital.storage.store[resourceType] > 0) {
                containerRequests.push(new PickupRequest(request.requester, this.parent.capitalName, this.parent.capital.storage, request.amount, resourceType, request.priority));
            }
            else if(this.parent.capital.terminal && this.parent.capital.terminal.store[resourceType] > 0) {
                containerRequests.push(new PickupRequest(request.requester, this.parent.capitalName, this.parent.capital.terminal, request.amount, resourceType, request.priority));
            }
        }

        // Assign creeps to do the things that need to be done
        for(const worker of idleCreeps) {
            if(!worker.creep) {
                continue;
            }

            // Each creep picks the task it likes most from the remaining tasks. Greedy, could be improved.
            let maxScore: number = 0;
            let bestRequestIndex: number = -1;
            for(const i in containerRequests) {
                const thisScore = _evaluateMatch(worker, containerRequests[i]);
                if(thisScore > maxScore) {
                    maxScore = thisScore;
                    bestRequestIndex = Number(i);
                }
            }

            if(maxScore > 0 && bestRequestIndex >= 0) {
                worker.job = _jobFromRequest(containerRequests[bestRequestIndex]);
                containerRequests[bestRequestIndex] = containerRequests[containerRequests.length - 1];
                containerRequests.pop();
                continue;
            }

            if(worker.creep.store.getUsedCapacity() === 0) {
                continue;
            }

            if(this.parent.capital.storage) {
                worker.job = new DropoffJob(this.parent.capital.storage, Object.keys(worker.creep.store)[0] as ResourceConstant);
                continue;
            }

            if(this.parent.capital.terminal) {
                worker.job = new DropoffJob(this.parent.capital.terminal, Object.keys(worker.creep.store)[0] as ResourceConstant);
                continue;
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}

function _evaluateMatch(worker: WorkerCreep, request: PickupRequest | DropoffRequest): number {
    if(!worker.creep) {
        return 0;
    }

    const amount = Math.min(request.amount,
        (request instanceof DropoffRequest) ? worker.creep.store[request.resourceType] : worker.creep.store.getFreeCapacity());

    const distance = (worker.creep.pos.roomName === request.container.pos.roomName) ? worker.creep.pos.getRangeTo(request.container.pos) :
        (Game.map.getRoomLinearDistance(worker.creep.pos.roomName, request.container.pos.roomName) + 0.5) * 50;

    // Adjust the scores so that tasks of each priority fall into clear bands and higher priority tasks are always preferred.
    const priorityAdjustment = 4000 - (request.priority * 1000);

    // Maximize the amount of resources transported per tick
    return (amount / distance) + priorityAdjustment;
}

function _jobFromRequest(request: PickupRequest | DropoffRequest): PickupJob | DropoffJob {
    if(request instanceof PickupRequest) {
        return new PickupJob(request.container, request.resourceType);
    }
    else {
        return new DropoffJob(request.container, request.resourceType);
    }
}
