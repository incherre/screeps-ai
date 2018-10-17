import { EnergyContainer, GeneralContainer } from "../misc/typeChecking";
import { Job } from "./job";

export class PickupJob extends Job {
    public static type: string = 'pickup';

    public container: Structure | Resource | null;
    public resourceType: ResourceConstant;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.container) {
            // if the container doesn't exist, return false
            return false;
        }
    
        if(!creep.pos.isNearTo(this.container)) {
            // if the creep isn't in range of the container, find a spot to target
            this.target = creep.pos.findClosestByRange(Job.getSpotsNear(this.container.pos));

            if(!this.target) {
                this.target = this.container.pos;
            }

            const range = creep.pos.getRangeTo(this.target);
            const halfDistance = Math.max(Math.ceil(range / 2), 5);
            this.ttr = Math.min(range, halfDistance);
        }
        else {
            // already there, time to do the job
            this.ttr = 0;
            this.target = creep.pos;
        }

        const test = this.container as any;
        if(this.container instanceof Resource) {
            // make sure you can get there in time
            return this.container.resourceType === this.resourceType && this.container.amount >= creep.pos.getRangeTo(this.container);
        }
        else if(this.resourceType === RESOURCE_ENERGY && (test as EnergyContainer).energy !== undefined) {
            // this container only has energy
            const asEnergy = test as EnergyContainer;
            return asEnergy.energy > 0;
        }
        else if(this.resourceType !== RESOURCE_ENERGY && this.resourceType !== RESOURCE_POWER && (test as StructureLab).mineralAmount !== undefined){
            // this container is a lab, and the creep is taking a mineral
            const asLab = test as StructureLab;
            return (asLab.mineralType !== null && asLab.mineralType === this.resourceType) && asLab.mineralAmount > 0;
        }
        else if((test as GeneralContainer).store !== undefined) {
            // this container could have anything
            const asGeneral = test as GeneralContainer;
            const resourceAmount = asGeneral.store[this.resourceType];
            return resourceAmount !== undefined && resourceAmount > 0;
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return PickupJob.type;
    }

    public getJobInfo(): string {
        if(this.container && this.target) {
            return [this.container.id, this.resourceType, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.container) {
            return [this.container.id, this.resourceType, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        if(this.container instanceof Resource) {
            creep.pickup(this.container);
        }
        else if(this.container) {
            creep.withdraw(this.container, this.resourceType);
        }
    }

    constructor (jobInfo: string | Structure | Resource, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        if(jobInfo instanceof Structure || jobInfo instanceof Resource) {
            this.container = jobInfo;
            this.resourceType = resourceType;
        }
        else {
            const fields = jobInfo.split(',');
            this.container = Game.getObjectById(fields[0]);
            this.ttr = Number(fields[1]);
            this.resourceType = fields[2] as ResourceConstant;
            const x = Number(fields[3]);
            const y = Number(fields[4]);
            const roomName = fields[5];

            if(x >= 0 && y >= 0) {
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        
        if(this.container && !this.target) {
            this.target = this.container.pos;
        }
    }
}