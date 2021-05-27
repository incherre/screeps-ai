import { PathingCallbackOptions } from "misc/pathingCallbacks";

/**
 * Abstract base class representing a job that a creep can do.
 */
export abstract class Job {
    public ttr: number;
    public target: RoomPosition | null;
    public targetRange: number;

    constructor () {
        this.ttr = 0;
        this.target = null;
        this.targetRange = 1;
    }

    /**
     * Refreshes any class variables that are only valid for one game tick.
     */
    public abstract tickInit(): void;

    /**
     * Recalculates the target location of the job and checks to see if the job is still valid.
     * @param creep - The creep performing the task
     * @returns - Whether the task is still valid or not
     */
    public abstract recalculateTarget(creep: Creep): boolean;

    /**
     * Performs the task. All creep intents should be set in here.
     * @param creep - The creep performing the task
     */
    public abstract do(creep: Creep): void;

    /**
     * Get the pathfinding options that should be used for this job.
     * @returns {PathingCallbackOptions} - The options to use when pathing for this creep
     */
    public getTrafficOptions(): PathingCallbackOptions {
        return { range: this.targetRange };
    }

    /**
     * Sets the Time To Recalculate. To conserve CPU, tasks are only recalculated when the creep should have reached its target.
     * @param pathLen - The length of the computed path to the target
     */
    public setTtr(pathLen: number): void {
        this.ttr = pathLen;
    }

    public abstract getJobType(): string;
    public abstract getJobInfo(): string;
}
