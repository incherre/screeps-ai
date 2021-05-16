import { Job } from "./job";
import { getSpotsNear } from "../misc/helperFunctions";

/**
 * Go to the specified room and help to establish a new colony.
 */
export class SettleJob extends Job {
    public static type: string = 'settle';

    // Inter-tick variables
    public roomName: string | null;
    public workSiteId: Id<Source> | Id<ConstructionSite> | Id<StructureController> | 'null';

    // Single-tick variables
    public workSite: Source | ConstructionSite | StructureController | null;

    constructor (jobInfo: string) {
        super();
        const fields = jobInfo.split(',');
        if(fields.length === 1 && jobInfo !== '') {
            this.roomName = jobInfo;
            this.workSiteId = 'null';
        }
        else if(jobInfo !== '') {
            this.roomName = fields[0];
            this.workSiteId = fields[1] as Id<Source> | Id<ConstructionSite> | Id<StructureController> | 'null';
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
            this.workSiteId = 'null';
        }

        this.workSite = null;
    }

    public tickInit(): void {
        if(this.workSiteId === 'null') {
            this.workSite = null;
        }
        else {
            this.workSite = Game.getObjectById(this.workSiteId);
        }
    }

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        if(creep.room.name !== this.roomName) {
            this.target = new RoomPosition(25, 25, this.roomName);
            return creep.getActiveBodyparts(MOVE) > 0;
        }

        if(creep.getActiveBodyparts(WORK) === 0 || creep.getActiveBodyparts(CARRY) === 0 || creep.getActiveBodyparts(MOVE) === 0) {
            return false;
        }

        // First, get energy
        if(creep.store.getFreeCapacity(RESOURCE_ENERGY) !== 0 && this.workSite instanceof Source) {
            return true;
        }

        if(creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && (!(this.workSite instanceof Source) || getSpotsNear(this.workSite.pos).length === 0)) {
            const source = creep.pos.findClosestByRange(FIND_SOURCES, {
                filter: (source: Source) => (source.energy > 0 || source.ticksToRegeneration < 10) &&
                                            (creep.pos.isNearTo(source) || getSpotsNear(source.pos).length > 0)
            });

            if(source) {
                this.workSiteId = source.id;
                this.workSite = source;
                this.target = source.pos;
                this.targetRange = 1;
                return true;
            }
        }

        // If there are construction sites, build them
        const constructionSite = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES);
        if (constructionSite) {
            this.workSiteId = constructionSite.id;
            this.workSite = constructionSite;
            this.target = constructionSite.pos;
            this.targetRange = 3;
            return true;
        }

        // Otherwise, upgrade the controller
        if (creep.room.controller) {
            this.workSiteId = creep.room.controller.id;
            this.workSite = creep.room.controller;
            this.target = creep.room.controller.pos;
            this.targetRange = 3;
            return true;
        }

        return false;
    }

    public do(creep: Creep) {
        if(this.workSite instanceof Source) {
            creep.harvest(this.workSite);
        }
        else if(this.workSite instanceof ConstructionSite) {
            creep.build(this.workSite);
        }
        else if(this.workSite instanceof StructureController) {
            creep.upgradeController(this.workSite);
        }
    }

    public getJobType(): string {
        return SettleJob.type;
    }

    public getJobInfo(): string {
        if(this.roomName && this.target) {
            return [this.roomName, this.workSiteId, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.roomName) {
            return [this.roomName, this.workSiteId, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }
}
