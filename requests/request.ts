export abstract class ScreepsRequest {
    public tti: number;
    public target: {x: number, y: number, roomName: string};
    public requester: string;

    public abstract getType(): string;

    constructor () {
        this.tti = 0;
        this.target = {x: 0, y: 0, roomName: ''};
        this.requester = '';
    }
}
