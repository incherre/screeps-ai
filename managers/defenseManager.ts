import { Colony } from "../colony";
import { DefendJob } from "../jobs/defendJob";
import { IdleJob } from "../jobs/idleJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class DefenseManager extends Manager {
    // static parameters
    public static type: string = 'defense';
    public static refillConstant: number = 1;

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];

        // make fill requests for the towers
        const towers = this.parent.structures.get(STRUCTURE_TOWER);
        if(towers) {
            for(const tower of towers) {
                if((tower as StructureTower).store.energy < (DefenseManager.refillConstant * (tower as StructureTower).store.getCapacity(RESOURCE_ENERGY))) {
                    requests.push(new DropoffRequest(DefenseManager.type, tower as StructureTower, /*resourceType=*/undefined, /*priority=*/1));
                }
            }
        }

        // spawn defenders
        let dangerCount: number = 0;
        for(const roomName of this.parent.remotes) {
            if(Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length > 0 && Game.rooms[roomName].find(FIND_MY_CREEPS).length > 0) {
                dangerCount++;
            }
        }

        for(let i = this.workers.length; i < dangerCount; i++) {
            requests.push(new SpawnRequest(DefenseManager.type, 'fighter', /*priority=*/2));
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        const enemies: Creep[] = this.parent.capital.find(FIND_HOSTILE_CREEPS);
        const attackers: Creep[] = [];
        const crippledAttackers: Creep[] = [];
        const healers: Creep[] = [];
        const hurtAllies: Creep[] = this.parent.capital.find(FIND_MY_CREEPS, {filter: (creep) => creep.hits < creep.hitsMax});

        // sort the enemies present in the capital
        for(const creep of enemies) {
            if(creep.getActiveBodyparts(HEAL) > 0) {
                healers.push(creep);
            }

            if(creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0 || creep.getActiveBodyparts(WORK) > 0) {
                attackers.push(creep);
            }
            else if(ATTACK in creep.body || RANGED_ATTACK in creep.body || WORK in creep.body) {
                crippledAttackers.push(creep);
            }
        }

        // use towers to attack them
        const towers = this.parent.structures.get(STRUCTURE_TOWER);
        if(towers) {
            for(const towerEntry of towers) {
                if((towerEntry as StructureTower).store.energy > 0) {
                    const tower = towerEntry as StructureTower;
                    let target = null;
                    if(attackers.length > 0) {
                        target = tower.pos.findClosestByRange(attackers);
                    }
                    else if(healers.length > 0 && crippledAttackers.length > 0) {
                        target = tower.pos.findClosestByRange(healers);
                    }
                    else if(enemies.length > 0) {
                        target = tower.pos.findClosestByRange(enemies);
                    }

                    if(target) {
                        tower.attack(target);
                    }
                    else {
                        if(hurtAllies.length > 0) {
                            target = tower.pos.findClosestByRange(hurtAllies);
                        }

                        if(target) {
                            tower.heal(target);
                        }
                    }
                }
            }
        }

        // find enemies in farm rooms
        const dangerRooms: string[] = [];
        for(const roomName of this.parent.remotes) {
            if(Game.rooms[roomName] && Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).length > 0 && Game.rooms[roomName].find(FIND_MY_CREEPS).length > 0) {
                dangerRooms.push(roomName);
            }
        }
        const dangerSet: Set<string> = new Set<string>(dangerRooms);

        // find attackers to deal with the problem
        const idleWorkers: WorkerCreep[] = [];
        for(const worker of this.workers) {
            if(worker.job instanceof IdleJob) {
                idleWorkers.push(worker);
            }
            else if(worker.job instanceof DefendJob && worker.job.roomName) {
                dangerSet.delete(worker.job.roomName);
            }
        }

        // distribute attackers
        for(const roomName of dangerSet.values()) {
            const worker = idleWorkers.pop();
            if(worker) {
                worker.job = new DefendJob(roomName);
            }
            else {
                break;
            }
        }

        if(idleWorkers.length > 0 && dangerRooms.length > 0) {
            for(let i = 0; i < idleWorkers.length; i++) {
                idleWorkers[i].job = new DefendJob(dangerRooms[i % dangerRooms.length]);
            }
        }
        else if(idleWorkers.length > 0) {
            for(const worker of idleWorkers) {
                worker.job = new DefendJob(this.parent.capital.name);
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
