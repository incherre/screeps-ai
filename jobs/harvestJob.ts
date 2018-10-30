import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";

export class HarvestJob extends Job {
    public static type: string = 'harvest';

    public source: Source | null;
    public sourceId: string | null;
    public sourceRoomName: string | null;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.sourceId || !this.sourceRoomName) {
            // if the source doesn't exist then we can't go there
            return false;
        }

        if(creep.room.name === this.sourceRoomName && this.source) {
            const containers = this.source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (struct) => struct.structureType === STRUCTURE_CONTAINER});
            const container = creep.pos.findClosestByRange(containers);
        
            if(container) {
                // if there's a container by the source, target it
                this.target = container.pos;
            }
            else if(creep.pos.getRangeTo(this.source) <= 1) {
                // already there
                this.target = creep.pos;
            }
            else {
                // if the creep isn't in range of the source, find a spot to target
                this.target = creep.pos.findClosestByRange(getSpotsNear(this.source.pos));

                if(!this.target) {
                    this.target = this.source.pos;
                }
            }
        }
        else {
            // find a path to the desired room
            const exitConstant = creep.room.findExitTo(this.sourceRoomName);

            if(exitConstant === ERR_NO_PATH || exitConstant === ERR_INVALID_ARGS) {
                return false;
            }

            this.target = creep.pos.findClosestByRange(exitConstant);
        }

        if(!this.target) {
            this.target = new RoomPosition(25, 25, this.sourceRoomName);
            this.ttr = 25;
        }
        else {
            const range = creep.pos.getRangeTo(this.target);
            const halfDistance = Math.max(Math.ceil(range / 2), 5);
            this.ttr = Math.min(range, halfDistance);
        }

        return creep.getActiveBodyparts(WORK) > 0 && (creep.getActiveBodyparts(CARRY) === 0 || _.sum(creep.carry) < creep.carryCapacity);
    }

    public getJobType(): string {
        return HarvestJob.type;
    }

    public getJobInfo(): string {
        let vals: any[];

        if(this.sourceId && this.sourceRoomName) {
            vals = [this.sourceId, this.sourceRoomName, this.ttr]
        }
        else {
            return '';
        }

        if(this.target) {
            vals.concat([this.target.x, this.target.y, this.target.roomName]);
        }
        else {
            vals.concat([-1, -1, 'none']);
        }

        return vals.join();
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
            this.sourceId = jobInfo.id;
            this.sourceRoomName = jobInfo.room.name;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.sourceId = fields[0];
            this.source = Game.getObjectById(this.sourceId);
            this.sourceRoomName = fields[1];
            this.ttr = Number(fields[2]);

            if(Number(fields[3]) >= 0) {
                const x = Number(fields[3]);
                const y = Number(fields[4]);
                const roomName = fields[5];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.source = null;
            this.sourceId = null;
            this.sourceRoomName = null;
        }
        
        if(this.source && !this.target) {
            this.target = this.source.pos;
        }
    }
}