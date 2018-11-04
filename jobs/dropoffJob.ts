import { getSpotsNear } from "../misc/helperFunctions";
import { EnergyContainer, GeneralContainer } from "../misc/typeChecking";
import { Job } from "./job";

export class DropoffJob extends Job {
    public static type: string = 'dropoff';

    public container: Structure | Creep | null;
    public containerId: string | null;
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
                this.containerRoomName = this.container.room.name;
                const resourceAmount = creep.carry[this.resourceType];
                return resourceAmount !== undefined && resourceAmount > 0 && _.sum(this.container.carry) < this.container.carryCapacity;
            }
            else {
                return false;
            }
        }
        else {
            return false;
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

    constructor (jobInfo: string | Structure | Creep, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        if(jobInfo instanceof Structure || jobInfo instanceof Creep) {
            this.container = jobInfo;
            this.resourceType = resourceType;
            this.containerId = jobInfo.id;
            this.containerRoomName = jobInfo.pos.roomName;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.containerId = fields[0];
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
