import { CreepContainer, EnergyContainer, GeneralContainer } from "../misc/typeChecking";
import { Job } from "./job";

export class DropoffJob extends Job {
    public container: Structure | Creep | null;

    public recalculateTarget(creep: Creep): boolean {
        if(this.container) {
            if(creep.pos.getRangeTo(this.container) > 1) {
                this.target = creep.pos.findClosestByRange(Job.getSpotsNear(this.container.pos));
                if(!this.target) {
                    this.target = this.container.pos;
                }

                const range = creep.pos.getRangeTo(this.target);
                const halfDistance = Math.max(Math.ceil(range / 2), 5);
                this.ttr = Math.min(range, halfDistance);
            }

            else {
                this.ttr = 0;
                this.target = creep.pos;
            }

            const test = this.container as any;
            if((test as EnergyContainer).energy !== undefined) {
                const asEnergy = test as EnergyContainer;
                return creep.carry.energy > 0 && asEnergy.energy < asEnergy.energyCapacity;
            }
            else if((test as GeneralContainer).store !== undefined) {
                const asGeneral = test as GeneralContainer;
                return creep.carry.energy > 0 && _.sum(asGeneral.store) < asGeneral.storeCapacity;
            }
            else if((test as CreepContainer).carry !== undefined) {
                const asCreep = test as CreepContainer;
                return creep.carry.energy > 0 && _.sum(asCreep.carry) < asCreep.carryCapacity;
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
        return 'dropoff';
    }

    public getJobInfo(): string {
        if(this.container && this.target) {
            return [this.container.id, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.container) {
            return [this.container.id, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        if(this.container) {
            creep.transfer(this.container, RESOURCE_ENERGY);
        }
    }

    constructor (jobInfo: string | Structure | Creep) {
        super();
        if(jobInfo instanceof Structure || jobInfo instanceof Creep) {
            this.container = jobInfo;
        }
        else {
            const fields = jobInfo.split(',');
            this.container = Game.getObjectById(fields[0]);
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        
        if(this.container) {
            this.target = this.container.pos;
        }
    }
}