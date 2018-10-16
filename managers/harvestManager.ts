import { Colony } from "../colony";
import { DropoffJob } from "../jobs/dropoffJob";
import { HarvestJob } from "../jobs/harvestJob";
import { UpgradeJob } from "../jobs/upgradeJob";
import { EnergyContainer, GeneralContainer } from "../misc/typeChecking";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class HarvestManager extends Manager {
    public static workerNumber = 3;
    public static managerType = 'harvest';

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        for(let i = 0; i < (HarvestManager.workerNumber - this.workers.length); i++){
            requests.push(new SpawnRequest(HarvestManager.managerType, 'worker'));
        }
        return requests;
    }

    public manage(): void{
        const hungryContainers: Array<Structure | Creep> = [];
        for(const i in this.buildings) {
            const test = this.buildings[i] as any;
            if((test as EnergyContainer).energy !== undefined) {
                const asEnergy = (test as EnergyContainer);
                if(asEnergy.energy < asEnergy.energyCapacity) {
                    hungryContainers.push(this.buildings[i]);
                }
            }
            else if((test as GeneralContainer).store !== undefined) {
                const asGeneral = (test as GeneralContainer);
                if(_.sum(asGeneral.store) < asGeneral.storeCapacity) {
                    hungryContainers.push(this.buildings[i]);
                }
            }
        }

        let upgraders: number = 0;
        const fullWorkers: WorkerCreep[] = [];
        const emptyWorkers: WorkerCreep[] = [];
        for(const i in this.workers) {
            if(this.workers[i].job.getJobType() === 'idle') { // TODO(Daniel): replace 'idle' with something like IdleJob.name
                const idleCreep = this.workers[i].creep;
                if(idleCreep.carry.energy > 0) {
                    fullWorkers.push(this.workers[i]);
                }
                else if(idleCreep.getActiveBodyparts(CARRY) > 0) {
                    emptyWorkers.push(this.workers[i]);
                }
            }
            else if(this.workers[i].job.getJobType() === 'upgrade') { // TODO(Daniel): replace 'upgrade' with something like UpgradeJob.name
                upgraders++;
                if(_.sum(this.workers[i].creep.carry) < 0.5 * this.workers[i].creep.carryCapacity) {
                    hungryContainers.push(this.workers[i].creep);
                }
            }
        }

        const upgrader = fullWorkers.pop();
        if(upgraders === 0 && upgrader && this.parent.capital.controller) {
            upgrader.job = new UpgradeJob(this.parent.capital.controller);
        }
        else if(upgrader) {
            fullWorkers.push(upgrader);
        }

        const sources: Source[] = this.parent.capital.find(FIND_SOURCES_ACTIVE);

        if(hungryContainers.length > 0) {
            for(let i = 0; i < fullWorkers.length; i++) {
                fullWorkers[i].job = new DropoffJob(hungryContainers[i % hungryContainers.length]);
            }
        }

        if(sources.length > 0) {
            for(let i = 0; i < emptyWorkers.length; i++) {
                emptyWorkers[i].job = new HarvestJob(sources[i % sources.length]);
            }
        }

        for(const i in this.workers) {
            this.workers[i].work();
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}