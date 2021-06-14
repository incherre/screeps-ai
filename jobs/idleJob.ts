import { Job } from "./job";

/**
 * Slacking off, ready to accept a new task.
 */
export class IdleJob extends Job {
    public static type: string = 'idle';

    constructor () {
        super();
    }

    public tickInit(): void {}

    public recalculateTarget(creep: Creep): boolean {
        this.ttr = 1;
        return true;
    }

    public do(creep: Creep): void {
        return;
    }

    public getJobType(): string {
        return IdleJob.type;
    }

    public getJobInfo(): string {
        return '';
    }
}
