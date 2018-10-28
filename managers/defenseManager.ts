import { Colony } from "../colony";
import { ScreepsRequest } from "../requests/request";
import { Manager } from "./manager";

export class DefenseManager extends Manager {
    public static type: string = 'defense';

    public generateRequests(): ScreepsRequest[] {
        return [];
    }

    public manage(): void {
        const enemies: Creep[] = this.parent.capital.find(FIND_HOSTILE_CREEPS);
        const attackers: Creep[] = [];
        const crippledAttackers: Creep[] = [];
        const healers: Creep[] = [];
        let hurtAllies: Creep[] | null = null;

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

        for(const building of this.buildings) {
            if(building.structureType === STRUCTURE_TOWER && (building as StructureTower).energy > 0) {
                const tower = building as StructureTower;
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
                    if(!hurtAllies) {
                        hurtAllies = this.parent.capital.find(FIND_MY_CREEPS, {filter: (creep) => creep.hits < creep.hitsMax});
                    }

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

    constructor (parent: Colony) {
        super(parent);
    }
}