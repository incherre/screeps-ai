import { Job } from "./job";

export class IdleJob extends Job {
    public recalculateTarget(creep: Creep): boolean {
        this.ttr = 0;
        return false;
    }

    public getJobType(): string {
        return 'idle';
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