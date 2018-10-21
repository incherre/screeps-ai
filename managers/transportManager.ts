import { Colony } from "../colony";
import { DropoffJob } from "../jobs/dropoffJob";
import { IdleJob } from "../jobs/idleJob";
import { PickupJob } from "../jobs/pickupJob";
import { shuffle } from "../misc/helperFunctions";
import { EnergyContainer, GeneralContainer } from "../misc/typeChecking";
import { DropoffRequest } from "../requests/dropoffRequest";
import { PickupRequest } from "../requests/pickupRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class TransportManager extends Manager {
    public static type = 'transport';

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const transportNumber = this.parent.capital.find(FIND_SOURCES).length + 1;
        for(let i = this.workers.length; i < transportNumber; i++){
            requests.push(new SpawnRequest(TransportManager.type, 'carrier'));
        }
        for(const i in this.workers) {
            const ttl = this.workers[i].creep.ticksToLive;
            if(ttl && ttl < 50) {
                requests.push(new SpawnRequest(TransportManager.type, 'carrier'));
            }
        }
        return requests;
    }

    public manage(): void {
        const dropoffRequests: ScreepsRequest[] = this.parent.requests[DropoffRequest.type];
        const pickupRequests: ScreepsRequest[] = this.parent.requests[PickupRequest.type];
        const hungryContainers: Map<ResourceConstant, Set<string>> = new Map<ResourceConstant, Set<string>>();
        hungryContainers.set(RESOURCE_ENERGY, new Set<string>());
        const fullContainers: Map<ResourceConstant, Set<string>> = new Map<ResourceConstant, Set<string>>();
        const resourcesGettingGot: Set<ResourceConstant> = new Set<ResourceConstant>();

        const idleEmpty: WorkerCreep[] = [];
        const idlePartFull: WorkerCreep[] = [];
        const idleFull: Map<ResourceConstant, WorkerCreep[]> = new Map<ResourceConstant, WorkerCreep[]>();
        idleFull.set(RESOURCE_ENERGY, []);

        // calculate all the things that need to get stuff, and what sort of activities are in progress
        if(dropoffRequests) {
            shuffle(dropoffRequests);
            for(const i in dropoffRequests) {
                if(dropoffRequests[i] instanceof DropoffRequest) {
                    const asDR = dropoffRequests[i] as DropoffRequest;
                    if(!hungryContainers.has(asDR.resourceType)){
                        hungryContainers.set(asDR.resourceType, new Set<string>());
                    }
                    
                    const resourceSet = hungryContainers.get(asDR.resourceType);
                    if(resourceSet) {
                        resourceSet.add(asDR.container.id);
                    }
                }
            }
        }

        for(const i in this.buildings) {
            const test = this.buildings[i] as any;
            if((test as EnergyContainer).energy !== undefined && (test as EnergyContainer).energy < (test as EnergyContainer).energyCapacity) {
                const energySet = hungryContainers.get(RESOURCE_ENERGY);
                if(energySet) {
                    energySet.add(this.buildings[i].id);
                }
            }
            else if((test as GeneralContainer).store !== undefined && _.sum((test as GeneralContainer).store) > 0) {
                const resources = Object.keys((test as GeneralContainer).store);
                for(const j in resources) {
                    const resourceAmount = (test as GeneralContainer).store[resources[j] as ResourceConstant];
                    if(resourceAmount && resourceAmount > 0) {
                        if(!fullContainers.has(resources[j] as ResourceConstant)) {
                            fullContainers.set(resources[j] as ResourceConstant, new Set<string>());
                        }
                        const resourceSet = fullContainers.get(resources[j] as ResourceConstant);
                        if(resourceSet) {
                            resourceSet.add(this.buildings[i].id);
                        }
                    }
                }
            }
        }

        if(pickupRequests) {
            shuffle(pickupRequests);
            for(const i in pickupRequests) {
                if(pickupRequests[i] instanceof PickupRequest) {
                    const asPR = pickupRequests[i] as PickupRequest;
                    if(!fullContainers.has(asPR.resourceType)) {
                        fullContainers.set(asPR.resourceType, new Set<string>());
                    }
                    const resourceSet = fullContainers.get(asPR.resourceType as ResourceConstant);
                    if(resourceSet) {
                        resourceSet.add(asPR.container.id);
                    }
                }
            }
        }

        const tombstones: Tombstone[] = this.parent.capital.find(FIND_TOMBSTONES);
        shuffle(tombstones);
        for(const i in tombstones) {
            if(_.sum(tombstones[i].store) > 0) {
                const resources = Object.keys(tombstones[i].store);
                for(const j in resources) {
                    const resourceAmount = tombstones[i].store[resources[j] as ResourceConstant];
                    if(resourceAmount && resourceAmount > 0) {
                        if(!fullContainers.has(resources[j] as ResourceConstant)) {
                            fullContainers.set(resources[j] as ResourceConstant, new Set<string>());
                        }
                        const resourceSet = fullContainers.get(resources[j] as ResourceConstant);
                        if(resourceSet) {
                            resourceSet.add(tombstones[i].id);
                        }
                    }
                }
            }
        }

        const droppedResources: Resource[] = this.parent.capital.find(FIND_DROPPED_RESOURCES);
        shuffle(droppedResources);
        for(const i in droppedResources) {
            if(!fullContainers.has(droppedResources[i].resourceType)) {
                fullContainers.set(droppedResources[i].resourceType as ResourceConstant, new Set<string>());
            }
            const resourceSet = fullContainers.get(droppedResources[i].resourceType as ResourceConstant);
            if(resourceSet) {
                resourceSet.add(droppedResources[i].id);
            }
        }

        for(const i in this.workers) {
            if(this.workers[i].job instanceof IdleJob) {
                const idleCreep = this.workers[i].creep;
                if(Object.keys(idleCreep.carry).length > 1) {
                    // full with something that's not energy
                    const resource: ResourceConstant = _.max(Object.keys(idleCreep.carry), (resourceType: ResourceConstant) => {
                        if(resourceType === RESOURCE_ENERGY) {
                            return -Infinity;
                        }
                        else {
                            return idleCreep.carry[resourceType];
                        }
                    }) as ResourceConstant;

                    if(!idleFull.has(resource)) {
                        idleFull.set(resource, []);
                    }

                    const workerList = idleFull.get(resource);
                    if(workerList) {
                        workerList.push(this.workers[i]);
                    }
                }
                else if(idleCreep.carry.energy > 0 && idleCreep.carry.energy < idleCreep.carryCapacity) {
                    // has some energy
                    idlePartFull.push(this.workers[i]);
                }
                else if(idleCreep.carry.energy > 0 && idleCreep.carry.energy === idleCreep.carryCapacity) {
                    // full with energy
                    const workerList = idleFull.get(RESOURCE_ENERGY);
                    if(workerList) {
                        workerList.push(this.workers[i]);
                    }
                }
                else {
                    // only one key in carry, must be energy; energy not greater than 0, must be 0 :. carry must be empty
                    idleEmpty.push(this.workers[i]);
                }
            }
            else if(this.workers[i].job instanceof PickupJob) {
                // the resource is being gotten
                const container =  (this.workers[i].job as PickupJob).container;
                const resourceType = (this.workers[i].job as PickupJob).resourceType;
                if(container) {
                    resourcesGettingGot.add(resourceType);
                    const resourceSet = fullContainers.get(resourceType);
                    if(resourceSet) {
                        resourceSet.delete(container.id);
                        if(resourceSet.size === 0) {
                            fullContainers.delete(resourceType);
                        }
                    }
                }
            }
            else if(this.workers[i].job instanceof DropoffJob) {
                // it's delivering it
                const container = (this.workers[i].job as DropoffJob).container;
                const resourceType = (this.workers[i].job as DropoffJob).resourceType;
                const resourceSet = hungryContainers.get(resourceType);
                
                if(resourceSet && container) {
                    resourceSet.delete(container.id);
                    if(resourceSet.size === 0) {
                        hungryContainers.delete(resourceType);
                    }
                }
            }
        }

        // now actually assign creeps to do the things that need to be done
        shuffle(idleEmpty);
        shuffle(idlePartFull);

        while(idleEmpty.length > 0 && fullContainers.size > 0) {
            // pair idle and empty workers with containers that need emptying
            const worker = idleEmpty.pop();
            const [resourceType, resourceSet] = fullContainers.entries().next().value;
            const containerId = resourceSet.values().next().value;
            const container = Game.getObjectById(containerId);
            resourceSet.delete(containerId);
            if(resourceSet.size === 0) {
                fullContainers.delete(resourceType);
            }

            if(worker && (container instanceof Structure || container instanceof Resource || container instanceof Tombstone)) {
                worker.job = new PickupJob(container, resourceType);
            }
        }

        const energyFull =  idleFull.get(RESOURCE_ENERGY);
        const energyHungry = hungryContainers.get(RESOURCE_ENERGY);
        if(energyFull) {
            shuffle(energyFull);
        }

        if(energyFull && energyHungry) {
            while(energyFull.length > 0 && energyHungry.size > 0) {
                // pair idle and full workers with containers that need energy
                const worker = energyFull.pop();
                const containerId = energyHungry.values().next().value;
                const container = Game.getObjectById(containerId);
                energyHungry.delete(containerId);
                if(worker && (container instanceof Structure || container instanceof Creep)) {
                    worker.job = new DropoffJob(container);
                }
            }
        }

        if(energyHungry) {
            while(idlePartFull.length > 0 && energyHungry.size > 0) {
                // pair idle and partially full workers with containers that need energy
                const worker = idlePartFull.pop();
                const containerId = energyHungry.values().next().value;
                const container = Game.getObjectById(containerId);
                energyHungry.delete(containerId);
                if(worker && (container instanceof Structure || container instanceof Creep)) {
                    worker.job = new DropoffJob(container);
                }
            }
            
            if(energyHungry.size > 0 && !resourcesGettingGot.has(RESOURCE_ENERGY) && idleEmpty.length > 0 && this.parent.capital.storage !== undefined && this.parent.capital.storage.store.energy > 0){
                // if there are still containers that need energy, and there are no workers going to pick up energy, and we have a store of it, and spare idle workers,
                // then send someone to pick some up
                const worker = idleEmpty.pop()
                if(worker) {
                    worker.job = new PickupJob(this.parent.capital.storage);
                }
            }
        }

        if(energyFull) {
            while(energyFull.length > 0 && this.parent.capital.storage !== undefined) {
                // if there are full workers that have nowhere to go, drop off their stuff at storage
                const worker = energyFull.pop();
                if(worker) {
                    worker.job = new DropoffJob(this.parent.capital.storage);
                }
            }
        }

        idleFull.delete(RESOURCE_ENERGY);
        hungryContainers.delete(RESOURCE_ENERGY);

        for(const [resource, readyWorkers] of idleFull.entries()) {
            shuffle(readyWorkers);
            const containerSet = hungryContainers.get(resource);
            if(containerSet) {
                // pair workers carrying minerals with the containers that require that mineral
                while(readyWorkers.length > 0 && containerSet.size > 0) {
                    const worker = readyWorkers.pop();
                    const containerId = containerSet.values().next().value;
                    const container = Game.getObjectById(containerId);
                    containerSet.delete(containerId);
                    if(worker && (container instanceof Structure || container instanceof Creep)) {
                        worker.job = new DropoffJob(container, resource);
                    }
                }

                // if we ran out of workers, assign one (if available) to go pick up something
                if(containerSet.size > 0 && !resourcesGettingGot.has(resource) && this.parent.capital.storage !== undefined && this.parent.capital.storage.store[resource] !== undefined){
                    let worker;
                    if(idleEmpty.length > 0) {
                        worker = idleEmpty.pop();
                    }
                    else if(idlePartFull.length > 0) {
                        worker = idlePartFull.pop();
                    }

                    if(worker) {
                        worker.job = new PickupJob(this.parent.capital.storage, resource);
                        resourcesGettingGot.add(resource);
                    }
                }
            }

            if(this.parent.capital.storage !== undefined) {
                // if there are more workers with a resource than things that require it, drop that resource off
                while(readyWorkers.length > 0) {
                    const worker = readyWorkers.pop();
                    if(worker) {
                        worker.job = new DropoffJob(this.parent.capital.storage, resource);
                    }
                }
            }
        }

        while(idlePartFull.length > 0 && fullContainers.size > 0) {
            // pair remaining idle and partially full workers with containers that need emptying
            const worker = idlePartFull.pop();
            const [resourceType, resourceSet] = fullContainers.entries().next().value;
            const containerId = resourceSet.values().next().value;
            const container = Game.getObjectById(containerId);
            resourceSet.delete(containerId);
            if(resourceSet.size === 0) {
                fullContainers.delete(resourceType);
            }

            if(worker && (container instanceof Structure || container instanceof Resource || container instanceof Tombstone)) {
                worker.job = new PickupJob(container, resourceType);
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
