import { ScreepsRequest } from "./request";

/**
 * Abstract base class representing a request made at the Empire level.
 */
export abstract class EmpireRequest extends ScreepsRequest {

    constructor (roomName: string, priority: number) {
        super("", roomName, priority);
    }
}
