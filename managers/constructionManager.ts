import { Colony } from "../colony";
import { ConstructJob } from "../jobs/constructJob";
import { IdleJob } from "../jobs/idleJob";
import { placeBaseSites } from "../misc/constructionTemplates";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnTypes } from "../requests/spawnRequest";
import { WorkerCreep } from "../worker";
import { Manager } from "./manager";

export class ConstructionManager extends Manager {
    public static type = 'construction';
    public static siteFrequency = 50; // 101; // this is currently set low for testing
    public static refillRatio = 0.5;
    public static targetSites = 3;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        const constructNumber = Math.min(this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES).length, 3);
        let actualNumber = this.workers.length;

        for(const worker of this.workers) {
            const ttl = worker.creep.ticksToLive;
            if(ttl && ttl < 50) {
                actualNumber--;
            }
            else if(worker.creep.carry.energy < ConstructionManager.refillRatio * worker.creep.carryCapacity) {
                requests.push(new DropoffRequest(ConstructionManager.type, worker.creep));
            }
        }

        for(let i = actualNumber; i < constructNumber; i++) {
            requests.push(new SpawnRequest(ConstructionManager.type, spawnTypes.worker));
        }

        return requests;
    }

    public placeSites(): void {
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
            sites += placeBaseSites(this.parent.capital, ConstructionManager.targetSites - sites);
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
                for(const roomName of this.parent.farms) {
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
                            retVal = this.parent.capital.createConstructionSite(source.pos.x + dx, source.pos.y + dy, STRUCTURE_CONTAINER);

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
    }

    public manage(): void {
        if(Game.time % ConstructionManager.siteFrequency === 0) {
            this.placeSites()
        }

        const unpairedSites: Set<string> = new Set<string>();
        let sites: ConstructionSite[] = this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES);

        if(this.parent.capital.storage) {
            for(const roomName of this.parent.farms) {
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

        for(let i = 0; i < this.workers.length; i++) {
            if(this.workers[i].job instanceof IdleJob && sites.length > 0) {
                this.workers[i].job = new ConstructJob(sites[i % sites.length]);
            }
            this.workers[i].work();
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
