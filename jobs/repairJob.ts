import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";


export class RepairJob extends Job {
    public static type: string = 'repair';
    public static range: number = 3;

    public repairable: Structure | null;
    public repairableId: string | null;
    public repairableRoomName: string | null;

    public recalculateTarget(creep: Creep): boolean {
        if(this.repairableId && this.repairableRoomName) {
            if(this.repairable && creep.pos.getRangeTo(this.repairable) > RepairJob.range) {
                this.target = this.repairable.pos;
            }
            else {
                this.target = creep.pos;
            }

            if(!this.target) {
                this.target = new RoomPosition(25, 25, this.repairableRoomName);
            }

            if(this.repairable) {
                return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0 && this.repairable.hits < this.repairable.hitsMax &&
                (creep.pos.getRangeTo(this.repairable) > RepairJob.range || creep.carry.energy > 0);
            }
            else {
                return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
            }
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return RepairJob.type;
    }

    public getJobInfo(): string {
        let vals: any[];

        if(this.repairableId && this.repairableRoomName) {
            vals = [this.repairableId, this.repairableRoomName, this.ttr];
        }
        else {
            return '';
        }

        if(this.target) {
            vals = vals.concat([this.target.x, this.target.y, this.target.roomName]);
        }
        else {
            vals = vals.concat([-1, -1, 'none']);
        }

        return vals.join();
    }

    public do(creep: Creep): void {
        if(this.repairable && creep.carry.energy > 0) {
            creep.repair(this.repairable);
        }
    }

    constructor (jobInfo: string | Structure) {
        super();
        this.targetRange = RepairJob.range;
        if(jobInfo instanceof Structure) {
            this.repairable = jobInfo;
            this.repairableId = jobInfo.id;
            this.repairableRoomName = jobInfo.room.name;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.repairableId = fields[0];
            this.repairable = Game.getObjectById(this.repairableId);
            this.repairableRoomName = fields[1];
            this.ttr = Number(fields[2]);

            if(Number(fields[3]) >= 0) {
                const x = Number(fields[3]);
                const y = Number(fields[4]);
                const roomName = fields[5];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.repairable = null;
            this.repairableId = null;
            this.repairableRoomName = null;
        }
        
        if(this.repairable && !this.target) {
            this.target = this.repairable.pos;
        }
    }
}
