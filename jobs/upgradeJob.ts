import { Job } from "./job";

export class UpgradeJob extends Job {
    public controller: StructureController | null;
    public static range: number = 3;

    public recalculateTarget(creep: Creep): boolean {
        if(this.controller) {
            if(creep.pos.getRangeTo(this.controller) > UpgradeJob.range) {
                this.target = creep.pos.findClosestByRange(Job.getSpotsNear(this.controller.pos, UpgradeJob.range));
                if(!this.target) {
                    this.target = this.controller.pos;
                }

                const range = creep.pos.getRangeTo(this.target);
                const halfDistance = Math.max(Math.ceil(range / 2), 5);
                this.ttr = Math.min(range, halfDistance);
            }
            else {
                this.ttr = 0;
                this.target = creep.pos;
            }

            return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
        }
        else {
            return false;
        }
    }

    public getJobType(): string {
        return 'upgrade';
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
        if(jobInfo instanceof StructureController) {
            this.controller = jobInfo;
        }
        else {
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
        
        if(this.controller) {
            this.target = this.controller.pos;
        }
    }
}