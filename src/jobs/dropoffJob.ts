import { Job } from "./job";

/**
 * Transport resources of some type to some store: creep or container.
 */
export class DropoffJob extends Job {
    public static type: string = 'dropoff';

    // Inter-tick variables
    public containerId: Id<AnyStoreStructure> | Id<Creep> | null;
    public containerRoomName: string | null;
    public resourceType: ResourceConstant;

    // Single-tick variables
    public container: AnyStoreStructure | Creep | null;

    constructor (jobInfo: string | AnyStoreStructure | Creep, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        if(jobInfo instanceof Structure || jobInfo instanceof Creep) {
            this.container = jobInfo;
            this.resourceType = resourceType;
            this.containerId = jobInfo.id;
            this.containerRoomName = jobInfo.pos.roomName;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.containerId = fields[0] as Id<AnyStoreStructure> | Id<Creep>;
            this.container = Game.getObjectById(this.containerId);
            this.containerRoomName = fields[1];
            this.resourceType = fields[2] as ResourceConstant;
            this.ttr = Number(fields[3]);
            const x = Number(fields[4]);
            const y = Number(fields[5]);
            const roomName = fields[6];

            if(x >= 0 && y >= 0) {
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.container = null;
            this.resourceType = resourceType;
            this.containerId = null;
            this.containerRoomName = null;
        }

        if(this.container && !this.target) {
            this.target = this.container.pos;
        }
    }

    public tickInit(): void {
        if(this.containerId) {
            this.container = Game.getObjectById(this.containerId);
        }
        else {
            this.container = null;
        }
    }

    public recalculateTarget(creep: Creep): boolean {
        if(!this.containerId || !this.containerRoomName) {
            // if the container doesn't exist, return false
            return false;
        }

        if(this.container) {
            this.target = this.container.pos;
            this.targetRange = 1;
        }

        if(!this.target) {
            this.target = new RoomPosition(25, 25, this.containerRoomName);
            this.targetRange = 22;
        }

        if(this.containerRoomName !== creep.room.name) {
            return true;
        }
        else if (this.container) {
            const resourceAmount = creep.store[this.resourceType];
            const availableCapacity = (this.container.store as StoreDefinition).getFreeCapacity(this.resourceType);
            return resourceAmount !== undefined && resourceAmount > 0 && availableCapacity !== null && availableCapacity > 0;
        }
        else {
            return false;
        }
    }

    public do(creep: Creep): void {
        if(this.container) {
            const retVal = creep.transfer(this.container, this.resourceType);
            if(retVal === OK) {
                this.containerId = null;
            }
            else if(retVal === ERR_NOT_IN_RANGE) {
                this.recalculateTarget(creep);
            }
        }
        else if(this.containerRoomName === creep.pos.roomName) {
            // if the container doesn't exist, but we're in the room where it should be, then it was probably a creep that died
            this.containerId = null;
        }
    }

    public getJobType(): string {
        return DropoffJob.type;
    }

    public getJobInfo(): string {
        let vals: any[];

        if(this.containerId && this.containerRoomName) {
            vals = [this.containerId, this.containerRoomName, this.resourceType, this.ttr];
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
