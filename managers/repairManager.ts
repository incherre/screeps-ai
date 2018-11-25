import { Colony } from "../colony";
import { IdleJob } from "../jobs/idleJob";
import { RepairJob } from "../jobs/repairJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { Manager } from "./manager";

import { profile } from "../Profiler/Profiler";

@profile
export class RepairManager extends Manager {
    // static parameters
    public static type = 'repair';
    public static towerConstant = 0.75;
    public static rampartDangerZone = 10000;

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];
        let repairNumber = 0;
        const wallCount = this.parent.capital.find(FIND_STRUCTURES, {filter: (struct) => (struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART) && struct.hits < struct.hitsMax}).length;

        if(wallCount > 0) {
            repairNumber += 1;
        }

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length === 0) {
                    const repairs = Game.rooms[roomName].find(FIND_STRUCTURES, {filter: (struct) => (struct.structureType === STRUCTURE_ROAD || struct.structureType === STRUCTURE_CONTAINER) && struct.hits < struct.hitsMax});
                    if(repairs.length > 0) {
                        repairNumber += 1;
                        break;
                    }
                }
            }
        }

        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            if(!worker.creep) {
                continue;
            }

            const ttl = worker.creep.ticksToLive;
            if(ttl && ttl < 50) {
                actualNumber--;
            }
            else if(worker.creep.carry.energy === 0) {
                requests.push(new DropoffRequest(RepairManager.type, worker.creep));
            }
        }

        for(let i = actualNumber; i < repairNumber; i++){
            requests.push(new SpawnRequest(RepairManager.type, spawnTypes.worker));
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        const neutrals = this.parent.capital.find(FIND_STRUCTURES, {filter: (struct) => (struct.structureType === STRUCTURE_CONTAINER || struct.structureType === STRUCTURE_ROAD) && struct.hits < struct.hitsMax});
        const walls = this.parent.capital.find(FIND_STRUCTURES, {filter: (struct) => (struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART) && struct.hits < struct.hitsMax});
        const weakestNeutral = _.min(neutrals, (neutral) => neutral.hits);

        let ramparts = this.parent.structures.get(STRUCTURE_RAMPART);
        if(!ramparts) {
            ramparts = [];
        }

        const dangerRamparts = _.filter(ramparts, (ramp) => ramp.hits <= RepairManager.rampartDangerZone);
        const dangerRampart = _.min(dangerRamparts, (ramp) => ramp.hits);

        let repairs = [];
        if(walls.length > 0) {
            repairs.push(_.min(walls, (wall) => wall.hits));
        }

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length === 0) {
                    repairs = repairs.concat(Game.rooms[roomName].find(FIND_STRUCTURES, {filter: (struct) => (struct.structureType === STRUCTURE_ROAD || struct.structureType === STRUCTURE_CONTAINER) && struct.hits < struct.hitsMax}));
                }
            }
        }
    
        if(repairs.length > 0) {
            for(let i = 0; i < this.workers.length; i++) {
                const worker = this.workers[i];
                if(worker.job instanceof IdleJob) {
                    worker.job = new RepairJob(repairs[i % repairs.length]);
                }
            }
        }

        const towers = this.parent.structures.get(STRUCTURE_TOWER);
        if(this.parent.capital.find(FIND_HOSTILE_CREEPS).length === 0 && towers) {
            for(const building of towers) {
                if(building instanceof StructureTower) {
                    const tower = building as StructureTower;
                    if(tower.energy > RepairManager.towerConstant * tower.energyCapacity) {
                        if(dangerRampart instanceof Structure) {
                            tower.repair(dangerRampart);
                        }
                        else if(weakestNeutral instanceof Structure) {
                            tower.repair(weakestNeutral);
                        }
                    }
                }
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
