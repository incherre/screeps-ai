import { ScreepsRequest } from "./request";

export abstract class EmpireRequest extends ScreepsRequest {
    public roomName: string;

    constructor (roomName: string) {
        super();
        this.roomName = roomName;
    }
}
