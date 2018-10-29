import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { ScoutJob } from "../jobs/scoutJob";
import { getAdjacentRooms, getOwnName, getRoomInfo} from "../misc/helperFunctions";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class ExplorationManager extends Manager {
    public static type = 'explore';
    public static refreshRate = 3000;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const controller = this.parent.capital.controller;
        let scoutNumber = 0;
        if(controller && controller.my && controller.level >= 3) {
            for(const roomName of getAdjacentRooms(this.parent.capital.name)) {
                const info = getRoomInfo(roomName);
                if(!info || Game.time - info.lastObserved > ExplorationManager.refreshRate) {
                    scoutNumber = 1;
                }
            }
        }

        const actualNumber = this.workers.length;
        for(let i = actualNumber; i < scoutNumber; i++) {
            requests.push(new SpawnRequest(ExplorationManager.type, 'scout'));
        }

        return requests;
    }

    public manage(): void {
        const idleWorkers: WorkerCreep[] = [];
        const adjacentRooms = getAdjacentRooms(this.parent.capital.name);
        const T0: Set<string> = new Set<string>(adjacentRooms);

        for(const worker of this.workers) {
            if(worker.job instanceof IdleJob) {
                idleWorkers.push(worker);
            }
            else if(worker.job instanceof ScoutJob) {
                const job = worker.job as ScoutJob;
                if(job.roomName) {
                    T0.delete(job.roomName);
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
            if(info && info.owner === null) {
                if(!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {parent: this.parent.capital.name, seedX: null, seedY: null};
                }
                else {
                    Memory.rooms[roomName].parent = this.parent.capital.name;
                }
            }
            else if(info && info.owner !== null && info.owner !== getOwnName() && Memory.rooms[roomName]) {
                delete Memory.rooms[roomName];
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
