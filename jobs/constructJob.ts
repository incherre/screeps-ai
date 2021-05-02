import { Job } from "./job";

export class ConstructJob extends Job {
    public static type: string = 'construct';

    public site: ConstructionSite | null | undefined;
    public static range: number = 3;

    public recalculateTarget(creep: Creep): boolean {
        if(this.site) {
            if(this.site.pos.roomName === creep.pos.roomName) {
                this.target = this.site.pos;
            }

            if(!this.target) {
                this.target = new RoomPosition(25, 25, this.site.pos.roomName);
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
        this.targetRange = ConstructJob.range;
        if(jobInfo instanceof ConstructionSite) {
            this.site = jobInfo;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.site = Game.constructionSites[fields[0]];
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
