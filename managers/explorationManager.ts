import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { ScoutJob } from "../jobs/scoutJob";
import { VisionJob } from "../jobs/visionJob";
import { getAdjacentRooms, getOwnName, getRoomInfo, shuffle} from "../misc/helperFunctions";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { VisionRequest } from "../requests/visionRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class ExplorationManager extends Manager {
    public static type = 'explore';
    public static refreshRate = 9000;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const controller = this.parent.capital.controller;
        let scoutNumber = 0;
        if(this.parent.capital.memory.needsVision && this.buildings.length === 0) {
            scoutNumber = 1;
            this.parent.capital.memory.needsVision = false;
        }
        else if(controller && controller.my && controller.level >= 3 && this.buildings.length === 0) {
            for(const roomName of getAdjacentRooms(this.parent.capital.name)) {
                const info = getRoomInfo(roomName);
                if(!info || Game.time - info.lastObserved > ExplorationManager.refreshRate) {
                    scoutNumber = 1;
                }
            }
        }

        const actualNumber = this.workers.length;
        for(let i = actualNumber; i < scoutNumber; i++) {
            requests.push(new SpawnRequest(ExplorationManager.type, spawnTypes.scout));
        }

        return requests;
    }

    public manage(): void {
        const observer: StructureObserver | undefined = _.find(this.buildings, (build) => build.structureType === STRUCTURE_OBSERVER) as StructureObserver;
        const visionRequests = this.parent.requests[VisionRequest.type];
        let visionRequest = null;
        const visionRequired: Set<string> = new Set<string>();
    
        const idleWorkers: WorkerCreep[] = [];
        const adjacentRooms = getAdjacentRooms(this.parent.capital.name);
        const T0: Set<string> = new Set<string>(adjacentRooms);

        if(visionRequests) {
            shuffle(visionRequests);
            visionRequest = visionRequests.pop();
            
            if(visionRequest && (visionRequest instanceof VisionRequest) && observer) {
                observer.observeRoom(visionRequest.roomName);
                visionRequest = visionRequests.pop();
            }

            if(visionRequests.length > 0 && this.workers.length === 0) {
                this.parent.capital.memory.needsVision = true;
                return; // if we have no scouts, there's no more to do
            }

            while(visionRequest) {
                if(visionRequest instanceof VisionRequest) {
                    visionRequired.add(visionRequest.roomName);
                }
                visionRequest = visionRequests.pop();
            }
        }

        for(const worker of this.workers) {
            if(worker.job instanceof IdleJob ) {
                idleWorkers.push(worker);
            }
            else if(worker.job instanceof ScoutJob) {
                if(worker.job.roomName) {
                    T0.delete(worker.job.roomName);
                }
            }
            else if(worker.job instanceof VisionJob) {
                if(worker.job.roomName) {
                    visionRequired.delete(worker.job.roomName);
                    T0.delete(worker.job.roomName);
                }
            }
        }

        if(idleWorkers.length > 0) {
            for(const roomName of visionRequired.values()) {
                const worker = idleWorkers.pop();
                if(worker) {
                    worker.job = new VisionJob(roomName);
                }
                else {
                    break;
                }
            }
        }

        if(idleWorkers.length > 0) {
            for(const roomName of T0.values()) {
                const info = getRoomInfo(roomName);
                if(!info || Game.time - info.lastObserved > ExplorationManager.refreshRate) {
                    const worker = idleWorkers.pop();
                    if(worker) {
                        worker.job = new ScoutJob(roomName);
                    }
                }

                if(idleWorkers.length === 0) {
                    break;
                }
            }
        }

        if(idleWorkers.length > 0) {
            const T1: Set<string> = new Set<string>();
            for(const T0RoomName of adjacentRooms) {
                for(const roomName of getAdjacentRooms(T0RoomName)){
                    T1.add(roomName);
                }
            }
            
            T1.delete(this.parent.capital.name);
            for(const roomName of adjacentRooms) {
                T1.delete(roomName);
            }

            for(const roomName of T1.values()) {
                const info = getRoomInfo(roomName);
                if(!info || Game.time - info.lastObserved > ExplorationManager.refreshRate) {
                    const worker = idleWorkers.pop();
                    if(worker) {
                        worker.job = new ScoutJob(roomName);
                    }
                }

                if(idleWorkers.length === 0) {
                    break;
                }
            }
        }

        for(const i in this.workers) {
            this.workers[i].work();
        }

        for(const roomName of adjacentRooms) {
            const info = getRoomInfo(roomName);
            if(info && !info.owner) {
                if(!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {parent: this.parent.capital.name, seed: null, lab: null, petals: null, seedX: null, seedY: null, needsVision: false};
                }
                else {
                    Memory.rooms[roomName].parent = this.parent.capital.name;
                }
            }
            else if(info && info.owner && info.owner !== getOwnName() && Memory.rooms[roomName]) {
                delete Memory.rooms[roomName];
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
