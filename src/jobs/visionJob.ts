import { addRoomInfo } from "../misc/mapFunctions";
import { Job } from "./job";

/**
 * Provide game vision for a few ticks to the specified room. Record info about that room and rooms on the way.
 */
export class VisionJob extends Job {
    public static type: string = 'vision';
    public static visionTimer: number = 5;
    public static range: number = 22;

    // Inter-tick variables
    public roomName: string | null;
    public visionCount: number;

    constructor (jobInfo: string) {
        super();
        this.targetRange = VisionJob.range;
        const fields = jobInfo.split(',');
        if(fields.length === 1 && jobInfo !== '') {
            this.roomName = jobInfo;
            this.visionCount = VisionJob.visionTimer;
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

    public tickInit(): void {}

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        addRoomInfo(creep.room); // might as well record the info for the rooms on the way

        this.target = new RoomPosition(25, 25, this.roomName);

        // it only makes sense to provide vision for a couple of ticks
        return this.visionCount > 0;
    }

    public do(creep: Creep): void {
        addRoomInfo(creep.room);
        this.visionCount--;
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
}
