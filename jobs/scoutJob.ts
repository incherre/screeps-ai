import { addRoomInfo, getRoomInfo } from "../misc/helperFunctions";
import { Job } from "./job";

import { profile } from "../Profiler/Profiler";

@profile
export class ScoutJob extends Job {
    public static type: string = 'scout';
    public static rescoutThreshold = 50;
    
    public roomName: string | null;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        this.do(creep); // might as well record the info for the rooms on the way
        
        this.target = new RoomPosition(25, 25, this.roomName);

        // it only makes sense to scout a room if it has either never been scouted, or hasn't been scouted recently
        const roomInfo = getRoomInfo(this.roomName);
        return !roomInfo || Game.time - roomInfo.lastObserved > ScoutJob.rescoutThreshold;
    }

    public getJobType(): string {
        return ScoutJob.type;
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
        addRoomInfo(creep.room);
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
