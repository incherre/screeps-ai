import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";


export class ConstructJob extends Job {
    public static type: string = 'construct';

    public site: ConstructionSite | null;
    public static range: number = 3;

    public recalculateTarget(creep: Creep): boolean {
        if(this.site) {
            if(creep.pos.getRangeTo(this.site) > ConstructJob.range) {
                this.target = creep.pos.findClosestByRange(getSpotsNear(this.site.pos, ConstructJob.range));
                if(!this.target) {
                    this.target = this.site.pos;
                }

                const range = creep.pos.getRangeTo(this.target);
                const halfDistance = Math.max(Math.ceil(range / 2), 5);
                this.ttr = Math.min(range, halfDistance);
            }
            else {
                this.ttr = 0;
                this.target = creep.pos;
            }

            return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return ConstructJob.type;
    }

    public getJobInfo(): string {
        if(this.site && this.target) {
            return [this.site.id, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.site) {
            return [this.site.id, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        if(this.site && creep.carry.energy > 0) {
            creep.build(this.site);
        }
    }

    constructor (jobInfo: string | ConstructionSite) {
        super();
        if(jobInfo instanceof ConstructionSite) {
            this.site = jobInfo;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.site = Game.getObjectById(fields[0]);
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.site = null;
        }
        
        if(this.site && !this.target) {
            this.target = this.site.pos;
        }
    }
}
