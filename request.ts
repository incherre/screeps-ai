abstract class Request {
    public tti: number;
    public target: {x: number, y: number, roomName: string};

    public abstract getType(): string;
    public abstract assignColony(colonies: Colony[]): Colony;

    constructor () {
        this.tti = 0;
        this.target = {x: 0, y: 0, roomName: ''};
    }
}
