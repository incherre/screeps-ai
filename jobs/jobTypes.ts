import { BusyJob } from "./busyJob";
import { DropoffJob } from "./dropoffJob";
import { HarvestJob } from "./harvestJob";
import { IdleJob } from "./idleJob";
import { Job } from "./job";

export const jobTypes: {[key: string]: (jobInfo: string) => Job} = {
    'busy': (jobInfo: string) => new BusyJob(),
    'dropoff':  (jobInfo: string) => new DropoffJob(jobInfo),
    'harvest':  (jobInfo: string) => new HarvestJob(jobInfo),
    'idle': (jobInfo: string) => new IdleJob(),
};