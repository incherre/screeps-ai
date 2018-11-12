import { Colony } from "./colony";
import { EmpireManager } from "./empireManagers/empireManager";
import { empireTypes } from "./manifest";
import { EmpireRequest } from "./requests/empireRequest";

import { profile } from "./Profiler/Profiler";

@profile
export class Empire {
    public static cpuBucketSkipThreshold = 500;
    public static cleanupWait = 7;

    public flags: Map<ColorConstant, Map<ColorConstant, Flag[]>>;
    public colonies: {[key: string]: Colony};
    public managers: EmpireManager[];
    public requests: Map<string, EmpireRequest[]>;

    constructor() {
        // cleanup memory, etc.
        if(Game.time % Empire.cleanupWait === 0) {
            this.cleanup();
        }

        // initialize flags
        this.flags = new Map<ColorConstant, Map<ColorConstant, Flag[]>>();
        for(const flagName in Game.flags) {
            let colorSet1 = this.flags.get(Game.flags[flagName].color);
            if(!colorSet1) {
                colorSet1 = new Map<ColorConstant, Flag[]>();
                this.flags.set(Game.flags[flagName].color, colorSet1);
            }

            let colorSet2 = colorSet1.get(Game.flags[flagName].secondaryColor);
            if(!colorSet2) {
                colorSet2 = [];
                colorSet1.set(Game.flags[flagName].secondaryColor, colorSet2);
            }

            colorSet2.push(Game.flags[flagName]);
        }

        // sort all the creeps into their parent colonies
        const creepMap: Map<string, Creep[]> = new Map<string, Creep[]>();
        for(const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if(room.controller && room.controller.my) {
                creepMap.set(roomName, []);
            }
        }

        for(const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            const list = creepMap.get(creep.memory.colonyRoom);
            if(list !== undefined) {
                list.push(creep);
            }
            // What to do if creep doesn't have a home?
        }

        // init colonies
        this.colonies = {};
        for(const roomName of creepMap.keys()) {
            const room = Game.rooms[roomName];
            const creeps = creepMap.get(roomName);
            if(room && creeps) {
                this.colonies[roomName] = new Colony(this, room, creeps);
            }
        }

        // init empire level managers
        this.requests = new Map<string, EmpireRequest[]>();
        this.managers = [];
        for(const managerName in empireTypes) {
            this.managers.push(empireTypes[managerName](this));
        }
    }

    public generateRequests(): void {
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            // generate colony requests
            for(const roomName in this.colonies) {
                this.addRequests(this.colonies[roomName].generateRequests());
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
            for(const roomName in this.colonies) {
                this.colonies[roomName].run();
            }

            // run the empire level managers
            for(const manager of this.managers) {
                manager.manage();
            }
        }
    }

    private cleanup(): void {
        // use this to clean out memory (and global)
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }
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