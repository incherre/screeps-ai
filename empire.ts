import { ScreepsRequest } from "requests/request";
import { WorkerCreep } from "worker";
import { Colony } from "./colony";
import { EmpireManager } from "./empireManagers/empireManager";
import { empireTypes } from "./manifest";
import { EmpireRequest } from "./requests/empireRequest";

export class Empire {
    // static parameters
    public static cpuBucketSkipThreshold = 500;

    // inter-tick variables
    public managers: Map<string, EmpireManager>;
    public colonies: Map<string, Colony>;

    // single-tick variables
    public flags: Map<string, Flag[]>;
    public requests: Map<string, EmpireRequest[]>;

    private constructor() {
        // initialize empty things
        this.flags = new Map<string, Flag[]>();
        this.requests = new Map<string, EmpireRequest[]>();

        // sort all the creeps into their parent colonies
        const creepMap: Map<string, Creep[]> = new Map<string, Creep[]>();
        const empireCreepMap: Map<string, WorkerCreep[]> = new Map<string, WorkerCreep[]>();
        for(const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if(room.controller && room.controller.my) {
                // find all rooms that are mine
                creepMap.set(roomName, []);
            }
        }

        for(const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            if(!creep.memory.colonyRoom) {
                continue;
            }

            const list = creepMap.get(creep.memory.colonyRoom);
            if(list !== undefined) {
                // add creeps to their rooms
                list.push(creep);
                continue;
            }

            let empireList = empireCreepMap.get(creep.memory.colonyRoom);
            if(!empireList){
                empireList = [];
                empireCreepMap.set(creep.memory.colonyRoom, empireList);
            }

            // Add Empire level creeps to their Empire level managers.
            empireList.push(new WorkerCreep(creep, this));
        }

        // Init colonies.
        this.colonies = new Map<string, Colony>();
        for(const roomName of creepMap.keys()) {
            const room = Game.rooms[roomName];
            const creeps = creepMap.get(roomName);
            if(room && creeps) {
                this.colonies.set(roomName, new Colony(this, room, creeps));
            }
        }

        // Init empire level managers
        this.managers = new Map<string, EmpireManager>();
        for(const managerName in empireTypes) {
            const newManager = empireTypes[managerName](this);

            const managerWorkers = empireCreepMap.get(managerName);
            if(managerWorkers) {
                newManager.workers = managerWorkers;
            }

            this.managers.set(managerName, newManager);
        }
    }

    public static getEmpire(): Empire {
        if(!(global.empire instanceof Empire)) {
            global.empire = new Empire();
        }

        return global.empire;
    }

    public tickInit(): void {
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            // initialize flags
            for(const flag of Object.values(Game.flags)) {
                const colorCode: string = [flag.color, flag.secondaryColor].join();
                let flagArray = this.flags.get(colorCode);

                if(!flagArray) {
                    flagArray = [];
                    this.flags.set(colorCode, flagArray);
                }

                flagArray.push(flag);
            }

            // initialize managers
            for(const [_, manager] of this.managers) {
                manager.tickInit();
            }

            // initialize colonies
            for(const colony of this.colonies.values()) {
                colony.tickInit();
            }
        }
    }

    public generateRequests(): void {
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            // Generate Empire-level manager requests.
            const roomRequests: Map<string, ScreepsRequest[]> = new Map<string, ScreepsRequest[]>();
            for(const [_, manager] of this.managers) {
                for(const request of manager.generateRequests()) {
                    if(request instanceof EmpireRequest) {
                        this.addSingleRequest(request);
                    }
                    else {
                        const roomName = request.roomName;
                        let requests = roomRequests.get(roomName);
                        if(!requests) {
                            requests = [];
                            roomRequests.set(roomName, requests);
                        }

                        requests.push(request);
                    }
                }
            }

            // Generate Colony requests.
            for(const colony of this.colonies.values()) {
                const requests = roomRequests.get(colony.capitalName) || [];
                this.addRequests(colony.generateRequests(requests));
            }
        }
    }

    public run(): void {
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            // run the colonies
            for(const colony of this.colonies.values()) {
                colony.run();
            }

            // run the empire level managers
            for(const [_, manager] of this.managers) {
                manager.manage();
            }
        }
    }

    public cleanup(): void {
        // clean out memory
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }

        this.flags.clear();
        this.requests.clear();

        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            // clean the colonies
            for(const colony of this.colonies.values()) {
                colony.cleanup();
            }

            // clean the empire level managers
            for(const [_, manager] of this.managers) {
                manager.cleanup();
            }
        }
    }

    public addColony(newColony: Colony): void {
        this.colonies.set(newColony.capitalName, newColony);
    }

    public addWorker(newWorker: WorkerCreep): void {
        if(!newWorker.creep?.memory.colonyRoom) {
            return;
        }

        const manager = this.managers.get(newWorker.creep?.memory.colonyRoom);
        if(manager) {
            manager.addWorker(newWorker);
        }
    }

    public getBlockingWorker(pos: RoomPosition): WorkerCreep | null {
        const immediateTempParent = this.colonies.get(pos.roomName);
        if(immediateTempParent) {
            return immediateTempParent.getBlockingWorker(pos);
        }

        const parentRoom = Game.rooms[pos.roomName]?.memory.parent;
        const indirectTempParent = (parentRoom) ? this.colonies.get(parentRoom) : null
        if(indirectTempParent) {
            return indirectTempParent.getBlockingWorker(pos);
        }

        // If this becomes an issue, we can LookForAt later.
        return null;
    }

    private addSingleRequest(newRequest: EmpireRequest): void {
        const type = newRequest.getType();
        let requests = this.requests.get(type);
        if(!requests) {
            requests = [];
            this.requests.set(type, requests);
        }

        requests.push(newRequest);
    }

    private addRequests(newRequests: EmpireRequest[]): void {
        for(const request of newRequests) {
            this.addSingleRequest(request);
        }
    }
}
