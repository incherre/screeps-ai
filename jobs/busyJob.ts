import { Job } from "./job";

export class BusyJob extends Job {
    public recalculateTarget(creep: Creep): boolean {
        this.ttr = 0;
        return creep.spawning;
    }

    public getJobType(): string {
        return 'busy';
    }

    public getJobInfo(): string {
        return '';
    }

    public do(): void {
        return;
    }

    constructor () {
        super();
    }
}