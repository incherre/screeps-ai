import { getOwnName } from "../misc/helperFunctions";
import { signs } from "../misc/signs";
import { Job } from "./job";

export class ReserveJob extends Job {
    public static type: string = 'reserve';

    public roomName: string | null;

    public recalculateTarget(creep: Creep): boolean {
        if(!this.roomName) {
            return false;
        }

        if(Game.rooms[this.roomName] && Game.rooms[this.roomName].controller) {
            const controller = Game.rooms[this.roomName].controller;
            if(controller) {
                this.target = controller.pos;
            }
        }

        if(!this.target) {
            this.target = new RoomPosition(25, 25, this.roomName);
        }

        // Make sure we can claim
        return creep.getActiveBodyparts(CLAIM) > 0;
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

    public do(creep: Creep) {
        if(this.roomName && Game.rooms[this.roomName]) {
            const controller = Game.rooms[this.roomName].controller;
            if(controller && (!controller.sign || controller.sign.username !== getOwnName())) {
                const sign: string = signs[Math.floor(Math.random() * signs.length)];
                creep.signController(controller, sign);
            }

            if(controller && (!controller.reservation || controller.reservation.ticksToEnd < (CONTROLLER_RESERVE_MAX - creep.getActiveBodyparts(CLAIM)))) {
                creep.reserveController(controller);
            }
        }
    }

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
}
