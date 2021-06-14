// General Imports:
import { Colony } from "./colony";
import { Empire } from "./empire";
import { EmpireManager } from "./empireManagers/empireManager";
import { Job } from "./jobs/job";
import { Manager } from "./managers/manager";

// -----Jobs-----
import { BusyJob } from "./jobs/busyJob";
import { ClaimJob } from "./jobs/claimJob";
import { ConstructJob } from "./jobs/constructJob";
import { DefendJob } from "./jobs/defendJob";
import { DropoffJob } from "./jobs/dropoffJob";
import { HarvestJob } from "./jobs/harvestJob";
import { IdleJob } from "./jobs/idleJob";
import { PickupJob } from "./jobs/pickupJob";
import { RepairJob } from "./jobs/repairJob";
import { ReserveJob } from "./jobs/reserveJob";
import { ScoutJob } from "./jobs/scoutJob";
import { SettleJob } from "./jobs/settleJob";
import { UpgradeJob } from "./jobs/upgradeJob";
import { VisionJob } from "./jobs/visionJob";

export const jobTypes: {[key: string]: (jobInfo: string) => Job} = {
    [BusyJob.type]: (jobInfo: string) => new BusyJob(),
    [ClaimJob.type]: (jobInfo: string) => new ClaimJob(jobInfo),
    [ConstructJob.type]: (jobInfo: string) => new ConstructJob(jobInfo),
    [DefendJob.type]: (jobInfo: string) => new DefendJob(jobInfo),
    [DropoffJob.type]: (jobInfo: string) => new DropoffJob(jobInfo),
    [HarvestJob.type]: (jobInfo: string) => new HarvestJob(jobInfo),
    [IdleJob.type]: (jobInfo: string) => new IdleJob(),
    [PickupJob.type]: (jobInfo: string) => new PickupJob(jobInfo),
    [RepairJob.type]: (jobInfo: string) => new RepairJob(jobInfo),
    [ReserveJob.type]: (jobInfo: string) => new ReserveJob(jobInfo),
    [ScoutJob.type]: (jobInfo: string) => new ScoutJob(jobInfo),
    [SettleJob.type]: (jobInfo: string) => new SettleJob(jobInfo),
    [UpgradeJob.type]: (jobInfo: string) => new UpgradeJob(jobInfo),
    [VisionJob.type]: (jobInfo: string) => new VisionJob(jobInfo),
};

// -----Managers-----
import { ConstructionManager } from "./managers/constructionManager";
import { DefenseManager } from "./managers/defenseManager";
import { ExplorationManager } from "./managers/explorationManager";
import { HarvestManager } from "./managers/harvestManager";
import { MineralManager } from "./managers/mineralManager";
import { RepairManager } from "./managers/repairManager";
import { SpawnManager } from "./managers/spawnManager";
import { TransportManager } from "./managers/transportManager";
import { UpgradeManager } from "./managers/upgradeManager";

export const managerTypes: {[key: string]: (parent: Colony) => Manager} = {
    [ConstructionManager.type]: (parent: Colony) => new ConstructionManager(parent),
    [DefenseManager.type]: (parent: Colony) => new DefenseManager(parent),
    [ExplorationManager.type]: (parent: Colony) => new ExplorationManager(parent),
    [HarvestManager.type]: (parent: Colony) => new HarvestManager(parent),
    [MineralManager.type]: (parent: Colony) => new MineralManager(parent),
    [RepairManager.type]: (parent: Colony) => new RepairManager(parent),
    [SpawnManager.type]: (parent: Colony) => new SpawnManager(parent),
    [TransportManager.type]: (parent: Colony) => new TransportManager(parent),
    [UpgradeManager.type]: (parent: Colony) => new UpgradeManager(parent),
};

// -----Empire Managers-----
import { ExpansionManager } from "./empireManagers/expansionManager";
import { MarketManager } from "./empireManagers/marketManager";

export const empireTypes: {[key: string]: (parent: Empire) => EmpireManager} = {
    [ExpansionManager.type]: (parent: Empire) => new ExpansionManager(parent),
    [MarketManager.type]: (parent: Empire) => new MarketManager(parent),
};
