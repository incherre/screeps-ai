import { Job } from "./job";

export class PickupJob extends Job {
    public static type: string = 'pickup';

    public container: AnyStoreStructure | Resource | Tombstone | Ruin | null;
    public containerId: Id<AnyStoreStructure> | Id<Resource> | Id<Tombstone> | Id<Ruin> | null;
    public containerRoomName: string | null;
    public resourceType: ResourceConstant;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.containerId || !this.containerRoomName) {
            // if the container doesn't exist, return false
            return false;
        }

        if(this.container) {
            this.target = this.container.pos;
        }

        if(!this.target) {
            this.target = new RoomPosition(25, 25, this.containerRoomName);
        }

        if(this.containerRoomName !== creep.room.name) {
            return true;
        }
        else if (this.container) {
            const hasSpace = creep.store.getFreeCapacity() > 0;
            if(this.container instanceof Resource) {
                // make sure you can get there in time
                return hasSpace && this.container.resourceType === this.resourceType && this.container.amount >= creep.pos.getRangeTo(this.container);
            }
            else {
                const resourceAmount = this.container.store[this.resourceType];
                return hasSpace && resourceAmount !== undefined && resourceAmount > 0;
            }
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return PickupJob.type;
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

    public do(creep: Creep): void {
        let retVal = -1;
        if(this.container instanceof Resource) {
            retVal = creep.pickup(this.container);
        }
        else if(this.container) {
            retVal = creep.withdraw(this.container, this.resourceType);
        }

        if(retVal === OK) {
            this.containerId = null;
        }
    }

    constructor (jobInfo: string | AnyStoreStructure | Resource | Tombstone | Ruin, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        if(jobInfo instanceof Structure || jobInfo instanceof Resource || jobInfo instanceof Tombstone || jobInfo instanceof Ruin) {
            this.container = jobInfo;
            this.resourceType = resourceType;
            this.containerId = jobInfo.id;
            this.containerRoomName = jobInfo.pos.roomName;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.containerId = fields[0] as Id<AnyStoreStructure> | Id<Resource> | Id<Tombstone> | Id<Ruin>;
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
}
