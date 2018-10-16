import { ScreepsRequest } from "./request";

export class SpawnRequest extends ScreepsRequest {
    public requester: string;
    public creepType: string;

    public getType(): string {
        return 'spawn';
    }

    constructor (requester: string, creepType: string) {
        super();
        this.requester = requester;
        this.creepType = creepType;
    }
}