import { PathingCallbackOptions } from "misc/pathingCallbacks";
import { getSpotsNear } from "../misc/mapFunctions";
import { Job } from "./job";

/**
 * Harvest the provided source or mineral.
 */
export class HarvestJob extends Job {
    public static type: string = 'harvest';
    public static mineralCooldown: number = 6; // the docs say 5, but it's 0 - 5, so actually mod 6

    // Inter-tick variables
    public sourceId: Id<Source> | Id<Mineral> | null;
    public sourceRoomName: string | null;

    // Single-tick variables
    public source: Source | Mineral | null;

    constructor(jobInfo: string | Source | Mineral) {
        super();
        this.targetRange = 0;
        if(jobInfo instanceof Source || jobInfo instanceof Mineral) {
            this.source = jobInfo;
            this.sourceId = jobInfo.id;
            this.sourceRoomName = jobInfo.pos.roomName;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.sourceId = fields[0] as Id<Source>;
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

    public tickInit(): void {
        if(this.sourceId) {
            this.source = Game.getObjectById(this.sourceId);
        }
        else {
            this.source = null;
        }
    }

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
                this.target = creep.pos.findClosestByRange(getSpotsNear(this.source.pos, /*range=*/1, /*considerCreeps=*/false));
            }
            this.targetRange = 0;
        }

        if(!this.target) {
            this.target = new RoomPosition(25, 25, this.sourceRoomName);
            this.targetRange = 22;
        }

        return creep.getActiveBodyparts(WORK) > 0;
    }

    public do(creep: Creep): void {
        const repairableContainers = creep.pos.findInRange(FIND_STRUCTURES, 0, {
            filter: (struct) => struct.structureType === STRUCTURE_CONTAINER && struct.hits < struct.hitsMax
        });

        if(repairableContainers.length > 0 && creep.store.energy > 0) {
            creep.repair(repairableContainers[0]);
        }
        else if(this.source instanceof Source && this.source.energy > 0) {
            creep.harvest(this.source);
        }
        else if(this.source instanceof Mineral && this.source.mineralAmount > 0 && Game.time % HarvestJob.mineralCooldown === 0) {
            creep.harvest(this.source);
        }
    }

    public getTrafficOptions(): PathingCallbackOptions {
        return { range: this.targetRange, walkNearSources: true };
    }

    public getJobType(): string {
        return HarvestJob.type;
    }

    public getJobInfo(): string {
        let vals: any[];

        if(this.sourceId && this.sourceRoomName) {
            vals = [this.sourceId, this.sourceRoomName, this.ttr];
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
}
