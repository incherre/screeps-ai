import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";

export class DefendJob extends Job {
    public static type: string = 'defend';

    public roomName: string | null;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        let attackRange = 1;
        if(creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
            attackRange = 3;
        }
        
        // find an enemy
        const closestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(closestHostile) {
            const range = creep.pos.getRangeTo(closestHostile);
            if(range > attackRange) {
                // move to enemy
                this.target = closestHostile.pos;
            }
            else {
                // already in range
                this.target = creep.pos;
            }
        }
        else {
            this.target = new RoomPosition(25, 25, this.roomName);
        }

        return (creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0) && (creep.room.name !== this.roomName || creep.room.find(FIND_HOSTILE_CREEPS).length > 0);
    }

    public getJobType(): string {
        return DefendJob.type;
    }

    public getJobInfo(): string {
        if(this.roomName && this.target) {
            return [this.roomName, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.roomName) {
            return [this.roomName, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        const nearestHostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(nearestHostile && creep.pos.getRangeTo(nearestHostile) <= 1 && creep.getActiveBodyparts(ATTACK) > 0) {
            creep.attack(nearestHostile);
        }
        if(nearestHostile && creep.pos.getRangeTo(nearestHostile) <= 3 && creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
            creep.rangedAttack(nearestHostile);
        }
    }

    constructor (jobInfo: string) {
        super();
        const fields = jobInfo.split(',');
        if(fields.length === 1 && jobInfo !== '') {
            this.roomName = jobInfo;
        }
        else if (jobInfo !== '') {
            this.roomName = fields[0];
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.roomName = null;
        }
    }
}
