import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";

export class HarvestJob extends Job {
    public static type: string = 'harvest';

    public source: Source | null;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.source) {
            // if the source doesn't exist then we can't go there
            return false;
        }
    
        if(creep.pos.getRangeTo(this.source) > 1) {
            // if the creep isn't in range of the source, find a spot to target
            this.target = creep.pos.findClosestByRange(getSpotsNear(this.source.pos));
            if(!this.target) {
                this.target = this.source.pos;
            }

            const range = creep.pos.getRangeTo(this.target);
            const halfDistance = Math.max(Math.ceil(range / 2), 5);
            this.ttr = Math.min(range, halfDistance);
        }
        else {
            this.ttr = 0;
            this.target = creep.pos;
        }

        return creep.getActiveBodyparts(CARRY) === 0 || _.sum(creep.carry) < creep.carryCapacity;
    }

    public getJobType(): string {
        return HarvestJob.type;
    }

    public getJobInfo(): string {
        if(this.source && this.target) {
            return [this.source.id, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.source) {
            return [this.source.id, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        if(this.source) {
            creep.harvest(this.source);
        }
    }

    constructor(jobInfo: string | Source) {
        super();
        if(jobInfo instanceof Source) {
            this.source = jobInfo;
        }
        else {
            const fields = jobInfo.split(',');
            this.source = Game.getObjectById(fields[0]);
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        
        if(this.source && !this.target) {
            this.target = this.source.pos;
        }
    }
}