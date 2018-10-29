import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";


export class RepairJob extends Job {
    public static type: string = 'repair';

    public repairable: Structure | null;
    public static range: number = 3;

    public recalculateTarget(creep: Creep): boolean {
        if(this.repairable) {
            if(creep.pos.getRangeTo(this.repairable) > RepairJob.range) {
                this.target = creep.pos.findClosestByRange(getSpotsNear(this.repairable.pos, RepairJob.range));
                if(!this.target) {
                    this.target = this.repairable.pos;
                }

                const range = creep.pos.getRangeTo(this.target);
                const halfDistance = Math.max(Math.ceil(range / 2), 5);
                this.ttr = Math.min(range, halfDistance);
            }
            else {
                this.ttr = 0;
                this.target = creep.pos;
            }

            return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0 && this.repairable.hits < this.repairable.hitsMax && creep.carry.energy > 0;
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return RepairJob.type;
    }

    public getJobInfo(): string {
        if(this.repairable && this.target) {
            return [this.repairable.id, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.repairable) {
            return [this.repairable.id, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        if(this.repairable && creep.carry.energy > 0) {
            creep.repair(this.repairable);
        }
    }

    constructor (jobInfo: string | Structure) {
        super();
        if(jobInfo instanceof Structure) {
            this.repairable = jobInfo;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.repairable = Game.getObjectById(fields[0]);
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.repairable = null;
        }
        
        if(this.repairable && !this.target) {
            this.target = this.repairable.pos;
        }
    }
}
