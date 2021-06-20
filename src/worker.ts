import { Empire } from "empire";
import { Colony } from "./colony";
import { IdleJob } from "./jobs/idleJob";
import { Job } from "./jobs/job";
import { jobTypes } from "./manifest"
import { TrafficController } from "misc/trafficController";

export class WorkerCreep {
    // Inter-tick variables
    public parent: Colony | Empire;
    public creepId: Id<Creep>;
    public job: Job;

    // Single-tick variables
    public creep: Creep | undefined;
    public moved: boolean;
    public worked: boolean;

    constructor (creep: Creep, parent: Colony | Empire) {
        this.parent = parent;
        this.creepId = creep.id;
        this.creep = creep;
        if(creep.memory.jobType && typeof creep.memory.jobInfo === 'string' && jobTypes[creep.memory.jobType]) {
            this.job = jobTypes[creep.memory.jobType](creep.memory.jobInfo);
        }
        else {
            console.log(('Jobtype: "' + creep.memory.jobType + '" not found!').fontcolor('red'));
            this.job = jobTypes.idle('');
        }
        this.moved = false;
        this.worked = false;
    }

    public tickInit(): void {
        const creep = Game.getObjectById(this.creepId);
        if(!(creep instanceof Creep)) {
            // OH NO, creep is probably dead
            return;
        }

        this.creep = creep;

        this.job.tickInit();
        this.moved = false;
        this.worked = false;
    }

    public work(): void {
        if(this.worked || !this.creep || this.creep.spawning) {
            return;
        }
        this.worked = true;

        if(this.job.ttr <= 0) {
            this.job.ttr = 0;
            this.creep.memory.path = undefined;
            if(!this.job.recalculateTarget(this.creep)) {
                this.job = new IdleJob();
            }
        }

        const creepPos = this.creep.pos;
        const targetPos = this.job.target;
        if(targetPos && targetPos.getRangeTo(creepPos) <= this.job.targetRange) {
            this.creep.memory.path = undefined;
            this.job.do(this.creep);
        }
        else if(targetPos && this.creep.fatigue === 0) {
            this.job.setTtr(TrafficController.getTrafficController().registerMovement(this.creep, targetPos, this.job.getTrafficOptions()));
        }
        else if(this.job.ttr > 0) {
            this.job.ttr--;
        }

        this.save();
    }

    public cleanup(): void {
        this.creep = undefined;
        this.moved = false;
        this.worked = false;
    }

    public save(): void {
        if(this.creep) {
            this.creep.memory.jobType = this.job.getJobType();
            this.creep.memory.jobInfo = this.job.getJobInfo();
        }
    }
}
