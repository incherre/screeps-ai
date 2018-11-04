import { getSpotsNear } from "../misc/helperFunctions";
import { Job } from "./job";

export class UpgradeJob extends Job {
    public static type: string = 'upgrade';

    public controller: StructureController | null;
    public static range: number = 3;

    public recalculateTarget(creep: Creep): boolean {
        if(this.controller) {
            if(creep.pos.getRangeTo(this.controller) > UpgradeJob.range) {
                this.target = this.controller.pos;
            }
            else {
                this.target = creep.pos;
            }

            return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return UpgradeJob.type;
    }

    public getJobInfo(): string {
        if(this.controller && this.target) {
            return [this.controller.id, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.controller) {
            return [this.controller.id, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }

    public do(creep: Creep): void {
        if(this.controller && creep.carry.energy > 0) {
            creep.upgradeController(this.controller);
        }
    }

    constructor (jobInfo: string | StructureController) {
        super();
        this.targetRange = UpgradeJob.range;
        if(jobInfo instanceof StructureController) {
            this.controller = jobInfo;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.controller = Game.getObjectById(fields[0]);
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.controller = null;
        }
        
        if(this.controller && !this.target) {
            this.target = this.controller.pos;
        }
    }
}
