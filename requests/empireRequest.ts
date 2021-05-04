import { ScreepsRequest } from "./request";

/**
 * Abstract base class representing a request made at the Empire level.
 * @property {string} roomName - The name of the room the request applies to
 */
export abstract class EmpireRequest extends ScreepsRequest {
    public roomName: string;

    constructor (roomName: string, priority: number) {
        super("", priority);
        this.roomName = roomName;
    }
}
