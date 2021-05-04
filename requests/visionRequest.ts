import { ScreepsRequest } from "./request";

/**
 * A request to provide vision to the specified room.
 * @property {string} roomName - The room to provide vision for
 */
export class VisionRequest extends ScreepsRequest {
    public static type = 'vision';
    public roomName: string;

    public getType(): string {
        return VisionRequest.type;
    }

    constructor (requester: string, roomName: string, priority: number = 3) {
        super(requester, priority);
        this.roomName = roomName;
    }
}
