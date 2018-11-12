import { Colony } from "./colony";

import { profile } from "./Profiler/Profiler";

@profile
export class Empire {
    public static cpuBucketSkipThreshold = 500;
    public static cleanupWait = 7;

    public flags: Map<ColorConstant, Map<ColorConstant, Flag[]>>;
    public colonies: Colony[];

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
        this.colonies = [];
        for(const roomName of creepMap.keys()) {
            const room = Game.rooms[roomName];
            const creeps = creepMap.get(roomName);
            if(room && creeps) {
                this.colonies.push(new Colony(room, creeps));
            }
        }
    }

    public generateRequests(): void {
        // generate colony requests
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            for(const colony of this.colonies) {
                colony.generateRequests();
            }
        }
    }

    public run(): void {
        // run the colonies
        if(Game.cpu.bucket >= Empire.cpuBucketSkipThreshold) {
            for(const colony of this.colonies) {
                colony.run();
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
}