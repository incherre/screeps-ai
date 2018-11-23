import { Colony } from "./colony";
import { EmpireManager } from "./empireManagers/empireManager";
import { empireTypes } from "./manifest";
import { EmpireRequest } from "./requests/empireRequest";

import { profile } from "./Profiler/Profiler";

@profile
export class Empire {
    // static parameters
    public static cpuBucketSkipThreshold = 500;

    // inter-tick variables
    public managers: EmpireManager[];
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
        for(const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if(room.controller && room.controller.my) {
                // find all rooms that are mine
                creepMap.set(roomName, []);
            }
        }

        for(const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            const list = creepMap.get(creep.memory.colonyRoom);
            if(list !== undefined) {
                // add creeps to their rooms
                list.push(creep);
            }
            // What to do if creep doesn't have a home?
        }

        // init colonies
        this.colonies = new Map<string, Colony>();
        for(const roomName of creepMap.keys()) {
            const room = Game.rooms[roomName];
            const creeps = creepMap.get(roomName);
            if(room && creeps) {
                this.colonies.set(roomName, new Colony(this, room, creeps));
            }
        }

        // init empire level managers
        this.managers = [];
        for(const managerName in empireTypes) {
            this.managers.push(empireTypes[managerName](this));
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
                const colorCode: string = flag.color + ',' + flag.secondaryColor;
                let flagArray = this.flags.get(colorCode);

                if(!flagArray) {
                    flagArray = [];
                    this.flags.set(colorCode, flagArray);
                }

                flagArray.push(flag);
            }

            // initialize managers
            for(const manager of this.managers) {
                manager.tickInit();
            }

            // initialise colonies
            for(const colony of this.colonies.values()) {
                colony.tickInit();
            }
        }
    }

    public generateRequests(): void {
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            // generate colony requests
            for(const colony of this.colonies.values()) {
                this.addRequests(colony.generateRequests());
            }

            // generate empire level manager requests
            for(const manager of this.managers) {
                this.addRequests(manager.generateRequests());
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
            for(const manager of this.managers) {
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
            for(const manager of this.managers) {
                manager.cleanup();
            }
        }
    }

    public addColony(newColony: Colony): void {
        this.colonies.set(newColony.capitalName, newColony);
    }

    private addRequests(newRequests: EmpireRequest[]): void {
        for(const request of newRequests) {
            const type = request.getType();
            let requests = this.requests.get(type);
            if(!requests) {
                requests = [];
                this.requests.set(type, requests);
            }

            requests.push(request);
        }
    }
}