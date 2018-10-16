import { Job } from "./job";

export class BusyJob extends Job {
    public static type: string = 'busy';

    public recalculateTarget(creep: Creep): boolean {
        this.ttr = 0;
        return creep.spawning;
    }

    public getJobType(): string {
        return BusyJob.type;
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