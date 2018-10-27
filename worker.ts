import { IdleJob } from "./jobs/idleJob";
import { Job } from "./jobs/job";
import { jobTypes } from "./manifest"

export class WorkerCreep {
    public creep: Creep;
    public job: Job;

    constructor (creep: Creep) {
        this.creep = creep;
        this.job = jobTypes[creep.memory.jobType](creep.memory.jobInfo);
    }

    public work(): void {
        if(this.job.ttr === Infinity) {
            // this can happen when the target is in another room
            this.job.ttr = 25; // 25 is the distance from the center of a room to an exit
        }

        if(this.job.ttr <= 0) {
            if(!this.job.recalculateTarget(this.creep)) {
                this.job = new IdleJob();
            }
        }

        const creepPos = this.creep.pos;
        const targetPos = this.job.target;
        if(targetPos && targetPos.isEqualTo(creepPos)) {
            this.job.do(this.creep);
        }
        else if(targetPos && this.creep.moveTo(targetPos, {reusePath: Math.max(this.job.ttr, 5)}) === OK) {
            this.job.ttr--;
        }

        this.save();
    }

    public save(): void {
        this.creep.memory.jobType = this.job.getJobType();
        this.creep.memory.jobInfo = this.job.getJobInfo();
    }
}
