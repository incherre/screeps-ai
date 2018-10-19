export abstract class Job {
    public abstract recalculateTarget(creep: Creep): boolean;
    public abstract getJobType(): string;
    public abstract getJobInfo(): string;
    public abstract do(creep: Creep): void;

    public priority: number;
    public ttr: number;
    public target: RoomPosition | null;

    constructor () {
        this.priority = 0;
        this.ttr = 0;
        this.target = null;
    }
}
