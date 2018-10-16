import { BusyJob } from "./busyJob";
import { DropoffJob } from "./dropoffJob";
import { HarvestJob } from "./harvestJob";
import { IdleJob } from "./idleJob";
import { Job } from "./job";
import { UpgradeJob } from "./upgradeJob";

export const jobTypes: {[key: string]: (jobInfo: string) => Job} = {
    [BusyJob.type]: (jobInfo: string) => new BusyJob(),
    [DropoffJob.type]: (jobInfo: string) => new DropoffJob(jobInfo),
    [HarvestJob.type]: (jobInfo: string) => new HarvestJob(jobInfo),
    [IdleJob.type]: (jobInfo: string) => new IdleJob(),
    [UpgradeJob.type]: (jobInfo: string) => new UpgradeJob(jobInfo),
};