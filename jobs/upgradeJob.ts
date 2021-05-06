import { getOwnName } from "../misc/helperFunctions";
import { signs } from "../misc/signs";
import { Job } from "./job";

/**
 * Upgrade the specified controller.
 */
export class UpgradeJob extends Job {
    public static type: string = 'upgrade';
    public static range: number = 3;

    // Inter-tick variables
    public controllerId: Id<StructureController> | null;

    // Single-tick variables
    public controller: StructureController | null;

    constructor (jobInfo: string | StructureController) {
        super();
        this.targetRange = UpgradeJob.range;
        if(jobInfo instanceof StructureController) {
            this.controller = jobInfo;
            this.controllerId = jobInfo.id;
        }
        else if (jobInfo !== '') {
            const fields = jobInfo.split(',');
            this.controllerId = fields[0] as Id<StructureController>
            this.controller = Game.getObjectById(this.controllerId);
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
            this.controllerId = null;
        }

        if(this.controller && !this.target) {
            this.target = this.controller.pos;
        }
    }

    public recalculateTarget(creep: Creep): boolean {
        if(this.controller) {
            this.target = this.controller.pos;

            return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0;
        }
        else {
            return false;
        }
    }

    public tickInit(): void {
        if(this.controllerId) {
            this.controller = Game.getObjectById(this.controllerId);
        }
        else {
            this.controller = null;
        }
    }

    public do(creep: Creep): void {
        if(this.controller && (!this.controller.sign || this.controller.sign.username !== getOwnName())) {
            const sign: string = signs[Math.floor(Math.random() * signs.length)];
            if(creep.signController(this.controller, sign) === ERR_NOT_IN_RANGE) {
                creep.move(creep.pos.getDirectionTo(this.controller));
            }
        }

        if(this.controller && creep.store.energy > 0) {
            creep.upgradeController(this.controller);
        }
    }

    public getJobType(): string {
        return UpgradeJob.type;
    }

    public getJobInfo(): string {
        if(this.controller && this.target) {
            return [this.controllerId, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.controller) {
            return [this.controllerId, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }
}
