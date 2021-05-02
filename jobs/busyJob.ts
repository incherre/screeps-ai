import { Job } from "./job";

// This job is used to represent a creep that can't do anything because it is still spawning.
// The name is inspired by the error code constant: ERR_BUSY.
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
