import { Job } from "./job";

/**
 * Repair some structure until the creep runs out of energy.
 */
export class RepairJob extends Job {
    public static type: string = 'repair';
    public static range: number = 3;

    // Inter-tick variables
    public repairableId: Id<Structure> | null;
    public repairableRoomName: string | null;

    // Single-tick variables
    public repairable: Structure | null;

    constructor (jobInfo: string | Structure) {
        super();
        this.targetRange = RepairJob.range;
        if(jobInfo instanceof Structure) {
            this.repairable = jobInfo;
            this.repairableId = jobInfo.id;
            this.repairableRoomName = jobInfo.room.name;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.repairableId = fields[0] as Id<Structure>;
            this.repairable = Game.getObjectById(this.repairableId);
            this.repairableRoomName = fields[1];
            this.ttr = Number(fields[2]);

            if(Number(fields[3]) >= 0) {
                const x = Number(fields[3]);
                const y = Number(fields[4]);
                const roomName = fields[5];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.repairable = null;
            this.repairableId = null;
            this.repairableRoomName = null;
        }

        if(this.repairable && !this.target) {
            this.target = this.repairable.pos;
        }
    }

    public tickInit(): void {
        if(this.repairableId) {
            this.repairable = Game.getObjectById(this.repairableId);
        }
        else {
            this.repairable = null;
        }
    }

    public recalculateTarget(creep: Creep): boolean {
        if(this.repairableId && this.repairableRoomName) {
            if(this.repairable) {
                this.target = this.repairable.pos;
            }

            if(!this.target) {
                this.target = new RoomPosition(25, 25, this.repairableRoomName);
            }

            if(this.repairable) {
                return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0 && this.repairable.hits < this.repairable.hitsMax &&
                (creep.pos.getRangeTo(this.repairable) > RepairJob.range || creep.store.energy > 0);
            }
            else {
                return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
            }
        }
        else {
            return false;
        }
    }

    public do(creep: Creep): void {
        if(!this.repairable) {
            return;
        }

        if(creep.store.energy > 0) {
            creep.repair(this.repairable);
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
        return RepairJob.type;
    }

    public getJobInfo(): string {
        let vals: any[];

        if(this.repairableId && this.repairableRoomName) {
            vals = [this.repairableId, this.repairableRoomName, this.ttr];
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
