export abstract class ScreepsRequest {
    public tti: number;
    public target: {x: number, y: number, roomName: string};
    public requester: string;
    public priority: number;

    public abstract getType(): string;

    constructor () {
        this.tti = 0;
        this.target = {x: 0, y: 0, roomName: ''};
        this.requester = '';
        this.priority = 3;
    }
}

// priorities:
// 0 => Do this NOW, no questions asked
// 1 => Extremely important, probably related to defense
// 2 => Elevated importance, probably related to economy / harvesting
// 3 => Normal operation
// 4+ => "Eh, if you have time"
