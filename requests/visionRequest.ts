import { ScreepsRequest } from "./request";

/**
 * A request to provide vision to the specified room.
 * @property {string} targetRoomName - The room to provide vision for
 */
export class VisionRequest extends ScreepsRequest {
    public static type = 'vision';
    public targetRoomName: string;

    public getType(): string {
        return VisionRequest.type;
    }

    constructor (requester: string, roomName: string, targetRoomName: string, priority: number = 3) {
        super(requester, roomName, priority);
        this.targetRoomName = targetRoomName;
    }
}
