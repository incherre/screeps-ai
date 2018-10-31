import { addRoomInfo } from "../misc/helperFunctions";
import { Job } from "./job";

export class VisionJob extends Job {
    public static type: string = 'vision';
    
    public roomName: string | null;
    public visionCount: number;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        addRoomInfo(creep.room); // might as well record the info for the rooms on the way
        
        if(creep.room.name !== this.roomName) {
            // get to the room
            const exitConstant = creep.room.findExitTo(this.roomName);

            if(exitConstant === ERR_NO_PATH || exitConstant === ERR_INVALID_ARGS) {
                return false;
            }

            this.target = creep.pos.findClosestByRange(exitConstant);

            if(!this.target) {
                this.target = new RoomPosition(25, 25, this.roomName);
                this.ttr = 25;
            }
            else {
                const range = creep.pos.getRangeTo(this.target);
                const halfDistance = Math.max(Math.ceil(range / 2), 5);
                this.ttr = Math.min(range, halfDistance);
            }
        }
        else if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49){
            // on an edge, move in
            this.ttr = 2;
            this.target = new RoomPosition(25, 25, this.roomName);
        }
        else {
            // already there, time to do the job
            this.ttr = 0;
            this.target = creep.pos;
        }

        // it only makes sense to provide vision for a couple of ticks
        return this.visionCount > 0;
    }

    public getJobType(): string {
        return VisionJob.type;
    }

    public getJobInfo(): string {
        if(this.roomName && this.target) {
            return [this.roomName, this.visionCount, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.roomName) {
            return [this.roomName, this.visionCount, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        addRoomInfo(creep.room);
        this.visionCount--;
    }

    constructor (jobInfo: string) {
        super();
        const fields = jobInfo.split(',');
        if(fields.length === 1 && jobInfo !== '') {
            this.roomName = jobInfo;
            this.visionCount = 5;
        }
        else if (jobInfo !== '') {
            this.roomName = fields[0];
            this.visionCount = Number(fields[1]);
            this.ttr = Number(fields[2]);

            if(Number(fields[3]) >= 0) {
                const x = Number(fields[3]);
                const y = Number(fields[4]);
                const roomName = fields[5];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.roomName = null;
            this.visionCount = 0;
        }
    }
}
