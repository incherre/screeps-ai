import { Empire } from "./empire";
import { Manager } from "./managers/manager";
import { managerTypes } from "./manifest";
import { getAdjacentRooms } from "./misc/helperFunctions";
import { EmpireRequest } from "./requests/empireRequest";
import { ScreepsRequest } from "./requests/request";
import { WorkerCreep } from "./worker";

export class Colony {
    // inter-tick variables
    public empire: Empire;
    public capitalName: string;
    public remotes: string[];
    public managers: Map<string, Manager>;
    public workers: WorkerCreep[];
    public threatLevel: number;

    // single-tick variables
    public capital: Room | undefined;
    public structures: Map<StructureConstant, Structure[]>;
    public workersByLocation: Map<string, WorkerCreep>;
    public requests: Map<string, ScreepsRequest[]>;

    constructor (empire: Empire, capital: Room, creeps: Creep[]) {
        // set the central room name & global empire
        this.capitalName = capital.name;
        this.empire = empire;
        this.threatLevel = 0;

        // set the names of nearby farms
        this.remotes = [];
        if (!Memory.rooms) {
            Memory.rooms = {};
        }
        for(const roomName of getAdjacentRooms(capital.name)) {
            if(Memory.rooms[roomName] && Memory.rooms[roomName].parent === capital.name) {
                this.remotes.push(roomName);
            }
        }

        // initialize managers
        this.managers = new Map<string, Manager>();
        for(const key of Object.keys(managerTypes)) {
            this.managers.set(key, managerTypes[key](this));
        }

        // initialize and distribute the workers
        this.workers = [];
        for(const creep of creeps) {
            if(creep.memory.managerType && this.managers.has(creep.memory.managerType)) {
                const worker = new WorkerCreep(creep, this);
                const manager = this.managers.get(creep.memory.managerType);
                if(manager) {
                    manager.workers.push(worker);
                }
                this.workers.push(worker);
            }
        }

        // init empty members
        this.structures = new Map<StructureConstant, Structure[]>();
        this.requests = new Map<string, ScreepsRequest[]>();
        this.workersByLocation = new Map<string, WorkerCreep>();
    }

    public tickInit(): void {
        // init capital
        if(!Game.rooms[this.capitalName]) {
            // OH NO! room was probably killed...
            return;
        }

        this.capital = Game.rooms[this.capitalName];

        // sort the structures
        const structures = this.capital.find(FIND_STRUCTURES, {
            filter: (structure: Structure) => !(structure instanceof OwnedStructure) || (structure as OwnedStructure).my
        });
        for(const struct of structures) {
            let structList = this.structures.get(struct.structureType);
            if(!structList) {
                structList = [];
                this.structures.set(struct.structureType, structList);
            }

            structList.push(struct);
        }

        // remove invalid workers
        let i = 0;
        while(i < this.workers.length) {
            if(!Game.getObjectById(this.workers[i].creepId)) {
                // move the last one to here and pop
                this.workers[i] = this.workers[this.workers.length - 1];
                this.workers.pop();
            }
            else {
                i++;
            }
        }

        // map out the workers
        for(const worker of this.workers) {
            worker.tickInit();
            this.addWorkerLoc(worker);
        }

        // init managers
        for(const manager of this.managers.values()) {
            manager.tickInit();
        }
    }

    public generateRequests(): EmpireRequest[] {
        const empireRequests: EmpireRequest[] = [];

        // generate any manager requests
        for(const manager of this.managers.values()) {
            const newRequests = manager.generateRequests();
            for(const request of newRequests) {
                if(request instanceof EmpireRequest) {
                    empireRequests.push(request);
                }
                else {
                    const type = request.getType();
                    let requestList = this.requests.get(type);
                    if(!requestList){
                        requestList = [];
                        this.requests.set(type, requestList);
                    }
                    requestList.push(request);
                }
            }
        }

        return empireRequests;
    }

    public run(): void {
        // run the managers, to decide what the creep tasks are, and what buildings will do
        for(const manager of this.managers.values()) {
            manager.manage();
        }

        // run the creep tasks
        for(const worker of this.workers) {
            worker.work();
        }
    }

    public cleanup(): void {
        this.capital = undefined;
        this.structures.clear();
        this.workersByLocation.clear();
        this.requests.clear();

        // clean workers
        for(const worker of this.workers) {
            worker.cleanup();
        }

        // clean managers
        for(const manager of this.managers.values()) {
            manager.cleanup();
        }
    }

    public addWorker(newOne: Creep | WorkerCreep): void {
        let newWorker = null;
        let creep: Creep | null = null;
        if(newOne instanceof Creep) {
            newWorker = new WorkerCreep(newOne, this);
            creep = newOne;
        }
        else if(newOne instanceof WorkerCreep) {
            newWorker = newOne;
            creep = Game.getObjectById(newOne.creepId);
        }

        if(newWorker && creep && creep.memory.managerType) {
            this.workers.push(newWorker);
            const manager = this.managers.get(creep.memory.managerType);
            if(manager) {
                manager.addWorker(newWorker);
            }
        }
        else {
            console.log("A worker failed to be added in", this.capitalName);
        }
    }

    private addWorkerLoc(worker: WorkerCreep): void {
        if(!worker.creep) {
            // can't have a location without a body
            return;
        }

        const posString: string = [worker.creep.pos.x, worker.creep.pos.y, worker.creep.pos.roomName].join();
        this.workersByLocation.set(posString, worker);
    }

    public getBlockingWorker(pos: RoomPosition): WorkerCreep | null {
        const posString: string = [pos.x, pos.y, pos.roomName].join();
        const worker = this.workersByLocation.get(posString);
        if(worker) {
            return worker;
        }
        else {
            return null;
        }
    }
}
