import { ScreepsRequest } from "./request";

export class SpawnRequest extends ScreepsRequest {
    public requester: string;
    public type: string;

    public getType(): string {
        return 'spawn';
    }

    constructor (requester: string, type: string) {
        super();
        this.requester = requester;
        this.type = type;
    }
}