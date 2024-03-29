import { removeAt } from "misc/arrayFunctions";
import { Colony } from "../colony";
import { ConstructJob } from "../jobs/constructJob";
import { IdleJob } from "../jobs/idleJob";
import { placeBaseRamparts, placeBaseSites } from "../misc/constructionTemplates";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";
import { RepairManager } from "./repairManager";

export class ConstructionManager extends Manager {
    // static parameters
    public static type = 'construction';
    public static siteFrequency = 53;
    public static refillRatio = 0.5;
    public static targetSites = 5;
    public static targetWorkers = 2;

    constructor (parent: Colony) {
        super(parent);
    }

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];
        let siteCount = this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES).length;
        if(this.parent.capital.storage) {
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName]) {
                    siteCount += Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES).length;
                }
            }
        }

        const constructNumber = Math.min(siteCount, ConstructionManager.targetWorkers);
        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            if(!worker.creep || worker.creep.spawning) {
                continue;
            }

            const ttl = worker.creep.ticksToLive;
            if(ttl && ttl < 50) {
                actualNumber--;
            }
            else if(worker.creep.store.energy < ConstructionManager.refillRatio * worker.creep.store.getCapacity()) {
                requests.push(new DropoffRequest(ConstructionManager.type, this.parent.capitalName, worker.creep, worker.creep.store.getFreeCapacity()));
            }
        }

        for(let i = actualNumber; i < constructNumber; i++) {
            requests.push(new SpawnRequest(ConstructionManager.type, this.parent.capitalName, 'worker'));
        }

        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        if(Game.time % ConstructionManager.siteFrequency === 0) {
            this.placeSites()
        }

        const unpairedSites: Set<Id<ConstructionSite>> = new Set<Id<ConstructionSite>>();
        let sites: ConstructionSite[] = this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES);

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.remotes) {
                if(Game.rooms[roomName]) {
                    sites = sites.concat(Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES));
                }
            }
        }

        for(const site of sites) {
            unpairedSites.add(site.id);
        }

        const idleWorkers: WorkerCreep[] = [];

        for(const worker of this.workers) {
            if(!worker.creep) {
                continue;
            }

            if(worker.job instanceof IdleJob) {
                idleWorkers.push(worker);
            }
            else if(worker.job instanceof ConstructJob) {
                const site = (worker.job as ConstructJob).site;
                const ttl = worker.creep.ticksToLive;
                if(ttl && ttl >= 50 && site) {
                    unpairedSites.delete(site.id);
                }
            }
        }

        for(const siteId of unpairedSites.values()) {
            if(idleWorkers.length > 0) {
                const worker = idleWorkers.pop();
                const site = Game.getObjectById(siteId);
                if(worker && site instanceof ConstructionSite) {
                    worker.job = new ConstructJob(site);
                }
            }
            else {
                break;
            }
        }

        if(sites.length > 0) {
            for(let i = 0; i < this.workers.length; i++) {
                if(this.workers[i].job instanceof IdleJob) {
                    this.workers[i].job = new ConstructJob(sites[i % sites.length]);
                }
            }
        }
        else {
            let i = 0;
            while(i < this.workers.length) {
                const worker = this.workers[i];
                if(!worker.creep) {
                    i++;
                    continue;
                }

                if(worker.job instanceof IdleJob) {
                    // if we have nothing more to build for the moment, give the workers to the repair manager
                    removeAt(this.workers, i);

                    worker.creep.memory.managerType = RepairManager.type;
                    const repairManager = this.parent.managers.get(RepairManager.type);
                    if(repairManager) {
                        repairManager.addWorker(worker);
                    }
                }
                else {
                    i++;
                }
            }
        }
    }

    private placeSites(): void {
        if(!this.parent.capital) {
            return;
        }

        // first, set the controller level
        let controllerLevel: number;
        if(this.parent.capital.controller) {
            controllerLevel = this.parent.capital.controller.level;
        }
        else {
            controllerLevel = 0;
        }

        // build the bunker
        let sites = this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES).length;
        if(sites < ConstructionManager.targetSites && controllerLevel >= 1) {
            sites += placeBaseSites(this.parent, ConstructionManager.targetSites - sites);
        }

        // place extractor
        if(sites < ConstructionManager.targetSites && controllerLevel >= 6) {
            const mineral = this.parent.capital.find(FIND_MINERALS);
            if(mineral.length > 0) {
                mineral[0].pos.createConstructionSite(STRUCTURE_EXTRACTOR);
            }
        }

        // place containers
        if(sites < ConstructionManager.targetSites && controllerLevel >= 3) {
            let sources: Array<Source | Mineral> = this.parent.capital.find(FIND_SOURCES);

            if(controllerLevel >= 6) {
                const mineral = this.parent.capital.find(FIND_MINERALS);
                if(mineral.length > 0) {
                    sources.push(mineral[0]);
                }
            }

            if(this.parent.capital.storage) {
                for(const roomName of this.parent.remotes) {
                    if(Game.rooms[roomName]) {
                        sources = sources.concat(Game.rooms[roomName].find(FIND_SOURCES));
                    }
                }
            }

            for(const source of sources) {
                if(sites >= ConstructionManager.targetSites) {
                    break;
                }

                const containerCount = source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (struct) => struct.structureType === STRUCTURE_CONTAINER}).length;
                const inProgress = source.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1, {filter: (site) => site.structureType === STRUCTURE_CONTAINER}).length;
                if(containerCount === 0 && inProgress === 0) {
                    let retVal;
                    for(let dx = -1; dx <= 1; dx++) {
                        for(let dy = -1; dy <= 1; dy++) {
                            if(source.room) {
                                retVal = source.room.createConstructionSite(source.pos.x + dx, source.pos.y + dy, STRUCTURE_CONTAINER);
                            }
                            else {
                                retVal = ERR_NOT_FOUND;
                            }

                            if(retVal === OK) {
                                sites++;
                                break;
                            }
                        }

                        if(retVal === OK) {
                            break;
                        }
                    }
                }
            }
        }

        // place ramparts
        if(sites < ConstructionManager.targetSites && this.parent.capital.storage) {
            sites += placeBaseRamparts(this.parent, ConstructionManager.targetSites - sites);
        }
    }
}
