import { getSpotsNear } from "../misc/helperFunctions";
import { EnergyContainer, GeneralContainer } from "../misc/typeChecking";
import { Job } from "./job";

export class DropoffJob extends Job {
    public static type: string = 'dropoff';

    public container: Structure | Creep | null;
    public resourceType: ResourceConstant;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.container) {
            // if the container doesn't exist, return false
            return false;
        }
    
        if(!creep.pos.isNearTo(this.container)) {
            // if the creep isn't in range of the container, find a spot to target
            this.target = creep.pos.findClosestByRange(getSpotsNear(this.container.pos));

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
        if(this.resourceType === RESOURCE_ENERGY && (test as EnergyContainer).energy !== undefined) {
            // this container only accepts energy
            const asEnergy = test as EnergyContainer;
            return creep.carry.energy > 0 && asEnergy.energy < asEnergy.energyCapacity;
        }
        else if(this.resourceType !== RESOURCE_ENERGY && this.resourceType !== RESOURCE_POWER && (test as StructureLab).mineralAmount !== undefined){
            // this container is a lab, and the creep is delivering a mineral
            const asLab = test as StructureLab;
            const resourceAmount = creep.carry[this.resourceType];
            return resourceAmount !== undefined && resourceAmount > 0 && (asLab.mineralType === null || asLab.mineralType === this.resourceType) && asLab.mineralAmount < asLab.mineralCapacity;
        }
        else if((test as GeneralContainer).store !== undefined) {
            // this container accepts anything
            const asGeneral = test as GeneralContainer;
            const resourceAmount = creep.carry[this.resourceType];
            return resourceAmount !== undefined && resourceAmount > 0 && _.sum(asGeneral.store) < asGeneral.storeCapacity;
        }
        else if(this.container instanceof Creep) {
            // this container is a creep
            const resourceAmount = this.container.carry[this.resourceType];
            return resourceAmount !== undefined && resourceAmount > 0 && _.sum(this.container.carry) < this.container.carryCapacity;
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return DropoffJob.type;
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
        if(this.container) {
            creep.transfer(this.container, this.resourceType);
        }
    }

    constructor (jobInfo: string | Structure | Creep, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        if(jobInfo instanceof Structure || jobInfo instanceof Creep) {
            this.container = jobInfo;
            this.resourceType = resourceType;
        }
        else {
            const fields = jobInfo.split(',');
            this.container = Game.getObjectById(fields[0]);
            this.resourceType = fields[1] as ResourceConstant;
            this.ttr = Number(fields[2]);
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