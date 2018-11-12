import { Empire } from "./empire";
import { Manager } from "./managers/manager";
import { managerTypes } from "./manifest";
import { getAdjacentRooms } from "./misc/helperFunctions";
import { EmpireRequest } from "./requests/empireRequest";
import { ScreepsRequest } from "./requests/request";
import { WorkerCreep } from "./worker";

import { profile } from "./Profiler/Profiler";

@profile
export class Colony {
    public empire: Empire;
    public capital: Room;
    public farms: string[];
    public structures: Map<StructureConstant, Structure[]>;

    public managers: {[key: string]: Manager};
    public requests: {[key: string]: ScreepsRequest[]};
    public workers: {[key: string]: WorkerCreep};

    constructor (empire: Empire, capital: Room, creeps: Creep[]) {
        // set the central room & global empire
        this.capital = capital;
        this.empire = empire;

        // set the names of nearby farms
        this.farms = [];
        for(const roomName of getAdjacentRooms(capital.name)) {
            if(Memory.rooms[roomName] && Memory.rooms[roomName].parent === capital.name) {
                this.farms.push(roomName);
            }
        }

        // sort the structures
        this.structures = new Map<StructureConstant, Structure[]>();
        const structures = capital.find(FIND_STRUCTURES, {filter: (structure: any) => !(structure instanceof OwnedStructure) || (structure as OwnedStructure).my});
        for(const struct of structures) {
            let structList = this.structures.get(struct.structureType);
            if(!structList) {
                structList = [];
                this.structures.set(struct.structureType, structList);
            }

            structList.push(struct);
        }

        // initialize managers
        this.managers = {};
        this.requests = {};
        for(const key of Object.keys(managerTypes)) {
            this.managers[key] = managerTypes[key](this);
        }

        // initialize and distribute the workers
        this.workers = {};
        for(const creep of creeps) {
            if(creep.memory.managerType in this.managers) {
                const worker = new WorkerCreep(creep, this);
                this.managers[creep.memory.managerType].workers.push(worker);
                this.addWorker(worker);
            }
        }
    }

    public generateRequests(): EmpireRequest[] {
        const empireRequests: EmpireRequest[] = [];

        // generate any manager requests
        for(const manager in this.managers) {
            const newRequests = this.managers[manager].generateRequests();
            for(const request of newRequests) {
                if(request instanceof EmpireRequest) {
                    empireRequests.push(request);
                }
                else {
                    const type = request.getType();
                    if(!this.requests[type]){
                        this.requests[type] = [];
                    }
                    this.requests[type].push(request);
                }
            }
        }

        return empireRequests;
    }

    public run(): void {
        // run the managers, to decide what the creep tasks are, and what buildings will do
        for(const manager in this.managers) {
            this.managers[manager].manage();
        }

        // run the creep tasks
        for(const posString in this.workers) {
            this.workers[posString].work();
        }
    }

    private addWorker(worker: WorkerCreep): void {
        const posString: string = [worker.creep.pos.x, worker.creep.pos.y, worker.creep.pos.roomName].join();
        this.workers[posString] = worker;
    }

    public getWorker(pos: RoomPosition): WorkerCreep | null {
        const posString: string = [pos.x, pos.y, pos.roomName].join();
        if(this.workers[posString]) {
            return this.workers[posString];
        }
        else {
            return null;
        }
    }
}
