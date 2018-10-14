abstract class Job {
    public abstract recalculateTarget(): boolean;
    public abstract getJobType(): string;
    public abstract getJobInfo(): string;
    public abstract do(creep: Creep): void;

    public priority: number;
    public ttr: number;
    public target: {x: number, y: number, roomName: string};

    constructor () {
        this.priority = 0;
        this.ttr = 0;
        this.target = {x: 0, y: 0, roomName: ''};
    }
}
