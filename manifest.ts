// General Imports:
import { Colony } from "./colony";
import { Job } from "./jobs/job";
import { Manager } from "./managers/manager";

// -----Jobs-----
import { BusyJob } from "./jobs/busyJob";
import { DropoffJob } from "./jobs/dropoffJob";
import { HarvestJob } from "./jobs/harvestJob";
import { IdleJob } from "./jobs/idleJob";
import { PickupJob } from "./jobs/pickupJob";
import { UpgradeJob } from "./jobs/upgradeJob";

export const jobTypes: {[key: string]: (jobInfo: string) => Job} = {
    [BusyJob.type]: (jobInfo: string) => new BusyJob(),
    [DropoffJob.type]: (jobInfo: string) => new DropoffJob(jobInfo),
    [HarvestJob.type]: (jobInfo: string) => new HarvestJob(jobInfo),
    [IdleJob.type]: (jobInfo: string) => new IdleJob(),
    [PickupJob.type]: (jobInfo: string) => new PickupJob(jobInfo),
    [UpgradeJob.type]: (jobInfo: string) => new UpgradeJob(jobInfo),
};

// -----Managers-----
import { HarvestManager } from "./managers/harvestManager";
import { SpawnManager } from "./managers/spawnManager";
import { TransportManager } from "./managers/transportManager";

export const managerTypes: {[key: string]: (parent: Colony) => Manager} = {
    [HarvestManager.type]: (parent: Colony) => new HarvestManager(parent),
    [SpawnManager.type]: (parent: Colony) => new SpawnManager(parent),
    [TransportManager.type]: (parent: Colony) => new TransportManager(parent),
};
