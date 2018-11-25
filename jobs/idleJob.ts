import { Job } from "./job";

import { profile } from "../Profiler/Profiler";

@profile
export class IdleJob extends Job {
    public static type: string = 'idle';

    public recalculateTarget(creep: Creep): boolean {
        this.ttr = 1;
        return true;
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
