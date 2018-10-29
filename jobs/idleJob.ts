import { Job } from "./job";

export class IdleJob extends Job {
    public static type: string = 'idle';

    public recalculateTarget(creep: Creep): boolean {
        this.ttr = 0;
        return false;
    }

    public getJobType(): string {
        return IdleJob.type;
    }

    public getJobInfo(): string {
        return '';
    }

    public do(creep: Creep): void {
        return;
    }

    constructor () {
        super();
    }
}
