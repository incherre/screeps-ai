import { Colony } from "../colony";
import { DropoffJob } from "../jobs/dropoffJob";
import { IdleJob } from "../jobs/idleJob";
import { PickupJob } from "../jobs/pickupJob";
import { ScreepsRequest } from "../requests/request";
import { ResourceRequest } from "../requests/resourceRequest";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class TransportManager extends Manager {
    public static type = 'transport';

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const transportNumber = 3;
        for(let i = this.workers.length; i < transportNumber; i++){
            requests.push(new SpawnRequest(TransportManager.type, 'carrier'));
        }
        for(const i in this.workers) {
            if(this.workers[i].creep.ticksToLive && this.workers[i].creep.ticksToLive < 50) {
                requests.push(new SpawnRequest(TransportManager.type, 'carrier'));
            }
        }
        return requests;
    }

    public manage(): void {
        const requests: ScreepsRequest[] = this.parent.requests[TransportManager.type];
        const hungryContainers: Map<string, Set<ResourceConstant>> = new Map<string, Set<ResourceConstant>>();
        const resourcesGettingGot: Set<ResourceConstant> = new Set<ResourceConstant>();

        const idleEmpty: WorkerCreep[] = [];
        const idlePartFull: WorkerCreep[] = [];
        const idleFull: Map<ResourceConstant, WorkerCreep[]> = new Map<ResourceConstant, WorkerCreep[]>();
        idleFull.set(RESOURCE_ENERGY, []);

        // calculate all the things that need to get stuff, and what sort of activities are in progress
        for(const i in requests) {
            if(requests[i] instanceof ResourceRequest) {
                const asRR = requests[i] as ResourceRequest;
                if(!hungryContainers.has(asRR.container.id)){
                    hungryContainers.set(asRR.container.id, new Set<ResourceConstant>());
                }
                
                const resourceSet = hungryContainers.get(asRR.container.id);
                if(resourceSet) {
                    resourceSet.add(asRR.resourceType);
                }
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
                resourcesGettingGot.add((this.workers[i].job as DropoffJob).resourceType);
            }
            else if(this.workers[i].job instanceof DropoffJob) {
                // it's delivering it
                const deliveryId = (this.workers[i].job as DropoffJob).container.id;
                const resourceType = (this.workers[i].job as DropoffJob).resourceType;
                const resourceSet = hungryContainers.get(deliveryId);
                
                if(resourceSet) {
                    resourceSet.delete(resourceType);
                }
            }
        }

        // now actually assign creeps to do the things that need to be done
        // TODO(Daniel): figure out where energy needs to come from, send idle creeps to dropoff/pickup resources
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
