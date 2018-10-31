import { ScreepsRequest } from "./request";

export class VisionRequest extends ScreepsRequest {
    public static type = 'vision';
    public roomName: string;

    public getType(): string {
        return VisionRequest.type;
    }

    constructor (requester: string, roomName: string) {
        super();
        this.requester = requester;
        this.roomName = roomName;
    }
}