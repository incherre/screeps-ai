import { OWN_NAME } from "../misc/constants";
import { signs } from "../misc/personalization";
import { Job } from "./job";

/**
 * Reserve the specified room and sign the controller, if it hasn't already been signed by the colony.
 */
export class ReserveJob extends Job {
    public static type: string = 'reserve';

    // Inter-tick variables
    public roomName: string | null;

    constructor (jobInfo: string) {
        super();
        const fields = jobInfo.split(',');
        if(fields.length === 1 && jobInfo !== '') {
            this.roomName = jobInfo;
        }
        else if (jobInfo !== '') {
            this.roomName = fields[0];
            this.ttr = Number(fields[1]);

            if(Number(fields[2]) >= 0) {
                const x = Number(fields[2]);
                const y = Number(fields[3]);
                const roomName = fields[4];
                this.target = new RoomPosition(x, y, roomName);
            }
        }
        else {
            this.roomName = null;
        }
    }

    public tickInit(): void {}

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        if(Game.rooms[this.roomName] && Game.rooms[this.roomName].controller) {
            const controller = Game.rooms[this.roomName].controller;
            if(controller) {
                this.target = controller.pos;
                this.targetRange = 1;
            }
        }

        if(!this.target) {
            this.target = new RoomPosition(25, 25, this.roomName);
            this.targetRange = 22;
        }

        // Make sure we can claim
        return creep.getActiveBodyparts(CLAIM) > 0;
    }

    public do(creep: Creep) {
        if(this.roomName && Game.rooms[this.roomName]) {
            const controller = Game.rooms[this.roomName].controller;
            if(controller && (!controller.sign || controller.sign.username !== OWN_NAME)) {
                const sign: string = signs[Math.floor(Math.random() * signs.length)];
                creep.signController(controller, sign);
            }

            if(controller && (!controller.reservation || controller.reservation.ticksToEnd < (CONTROLLER_RESERVE_MAX - creep.getActiveBodyparts(CLAIM)))) {
                creep.reserveController(controller);
            }
        }
    }

    public getJobType(): string {
        return ReserveJob.type;
    }

    public getJobInfo(): string {
        if(this.roomName && this.target) {
            return [this.roomName, this.ttr, this.target.x, this.target.y, this.target.roomName].join();
        }
        else if(this.roomName) {
            return [this.roomName, this.ttr, -1, -1, 'none'].join();
        }
        else {
            return '';
        }
    }
}
