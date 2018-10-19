import { ScreepsRequest } from "./request";

export class SpawnRequest extends ScreepsRequest {
    public static type = 'spawn';
    public creepType: string;

    public getType(): string {
        return SpawnRequest.type;
    }

    constructor (requester: string, creepType: string) {
        super();
        this.requester = requester;
        this.creepType = creepType;
    }
}