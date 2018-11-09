import { profile } from "../Profiler/Profiler";

@profile
export abstract class Job {
    public abstract recalculateTarget(creep: Creep): boolean;
    public abstract getJobType(): string;
    public abstract getJobInfo(): string;
    public abstract do(creep: Creep): void;

    public setTtr(pathLen: number): void {
        this.ttr = pathLen;
    }

    public priority: number;
    public ttr: number;
    public target: RoomPosition | null;
    public targetRange: number;

    constructor () {
        this.priority = 0;
        this.ttr = 0;
        this.target = null;
        this.targetRange = 1;
    }
}
