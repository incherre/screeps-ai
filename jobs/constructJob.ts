import { Job } from "./job";

/**
 * Build a construction site.
 */
export class ConstructJob extends Job {
    public static type: string = 'construct';
    public static range: number = 3;

    // Inter-tick variables
    public siteId: Id<ConstructionSite> | null;

    // Single-tick variables
    public site: ConstructionSite | null | undefined;

    constructor (jobInfo: string | ConstructionSite) {
        super();
        this.targetRange = ConstructJob.range;
        if(jobInfo instanceof ConstructionSite) {
            this.site = jobInfo;
            this.siteId = jobInfo.id;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.siteId = fields[0] as Id<ConstructionSite>;
            this.site = Game.constructionSites[this.siteId];
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
            this.siteId = null;
        }

        if(this.site && !this.target) {
            this.target = this.site.pos;
        }
    }

    public tickInit(): void {
        if(this.siteId) {
            this.site = Game.constructionSites[this.siteId];
        }
        else {
            this.site = null;
        }
    }

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

    public do(creep: Creep): void {
        if(!this.site) {
            return;
        }

        if(creep.store.energy > 0) {
            creep.build(this.site);
            return;
        }

        const itsFreeEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
            filter: (resource) => resource.resourceType === RESOURCE_ENERGY
        });
        if(itsFreeEnergy.length > 0) {
            creep.pickup(itsFreeEnergy[0]);
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
}
