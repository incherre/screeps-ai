import { Colony } from "../colony";
import { ConstructJob } from "../jobs/constructJob";
import { IdleJob } from "../jobs/idleJob";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
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
            requests.push(new SpawnRequest(ConstructionManager.type, 'worker'));
        }

        return requests;
    }

    public placeSites(): void {
        // first, find the bunker seed, if it exists. generate it and save it if it does not
        let seed: {x: number, y: number} = {x: -1, y: -1};
        if(this.parent.capital.memory.seedX && this.parent.capital.memory.seedY) {
            seed.x = this.parent.capital.memory.seedX;
            seed.y = this.parent.capital.memory.seedY;
        }
        else {
            seed = calculateOptimalPosition(this.parent.capital, 5, 0.5, -1, 1);
            this.parent.capital.memory.seedX = seed.x;
            this.parent.capital.memory.seedY = seed.y;
        }

        let controllerLevel: number;
        if(this.parent.capital.controller) {
            controllerLevel = this.parent.capital.controller.level;
        }
        else {
            controllerLevel = 0;
        }

        // build the bunker
        let sites = this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES).length;
        for(const buildingInfo of buildOrder) {
            const structure = buildingInfo.type;
            const level = buildingInfo.level;
            if(controllerLevel >= level && this.parent.capital.controller && CONTROLLER_STRUCTURES[structure][this.parent.capital.controller.level] > 0 &&
                (!(structure in [STRUCTURE_CONTAINER, STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART]) || this.parent.capital.controller.level >= 3)) {

                for(const seedRelativePosition of bunkerTemplate[structure]) {
                    const trueX = seed.x + seedRelativePosition.dx;
                    const trueY = seed.y + seedRelativePosition.dy;
                    const retVal = this.parent.capital.createConstructionSite(trueX, trueY, structure);

                    if(retVal === OK) {
                        sites++;

                        if(sites >= ConstructionManager.targetSites) {
                            break;
                        }
                    }
                }
            }

            if(sites >= ConstructionManager.targetSites) {
                break;
            }
        }

        // place containers
        if(sites < ConstructionManager.targetSites && controllerLevel >= 3) {
            const sources = this.parent.capital.find(FIND_SOURCES);
            for(const source of sources) {
                if(sites >= ConstructionManager.targetSites) {
                    break;
                }

                const containerCount = source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (struct) => struct.structureType === STRUCTURE_CONTAINER}).length;
                if(containerCount === 0) {
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

        // place extractor
        if(sites < ConstructionManager.targetSites && controllerLevel >= 6) {
            const mineral = this.parent.capital.find(FIND_MINERALS);
            if(mineral.length > 0) {
                mineral[0].pos.createConstructionSite(STRUCTURE_EXTRACTOR);
            }
        }

        // TODO(Daniel): Add arbitrary roads, walls, labs, observer, etc.
        // TODO(Daniel): Make the bunker layout a little less brittle
    }

    public manage(): void {
        if(Game.time % ConstructionManager.siteFrequency === 0) {
            this.placeSites()
        }

        const unpairedSites: Set<string> = new Set<string>();
        const sites: ConstructionSite[] = this.parent.capital.find(FIND_MY_CONSTRUCTION_SITES);

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

const buildOrder: Array<{type: BuildableStructureConstant, level: number}> = [
    {type: STRUCTURE_SPAWN, level: 1},
    {type: STRUCTURE_EXTENSION, level: 2},
    {type: STRUCTURE_TOWER, level: 3},
    {type: STRUCTURE_STORAGE, level: 4},
    {type: STRUCTURE_LINK, level: 5},
    {type: STRUCTURE_TERMINAL, level: 6},
    {type: STRUCTURE_POWER_SPAWN, level: 8},
    {type: STRUCTURE_ROAD, level: 4},
    {type: STRUCTURE_RAMPART, level: 4},
]

const bunkerTemplate: {[key: string]: Array<{dx: number, dy: number}>} = {
    [STRUCTURE_EXTENSION]: [
        {dx: -3, dy: 2}, {dx: -3, dy: 1}, {dx: -3, dy: -1}, {dx: -3, dy: -2}, {dx: -2, dy: -3}, {dx: -1, dy: -3},
        {dx: 1, dy: -3}, {dx: 2, dy: -3}, {dx: 3, dy: -2}, {dx: 3, dy: -1}, {dx: 3, dy: 1}, {dx: 3, dy: 2},
        {dx: 2, dy: 3}, {dx: 1, dy: 3}, {dx: -1, dy: 3}, {dx: -2, dy: 3}, {dx: -4, dy: 3}, {dx: -4, dy: 1},
        {dx: -4, dy: -1}, {dx: -4, dy: -3}, {dx: -3, dy: -4}, {dx: -1, dy: -4}, {dx: 1, dy: -4}, {dx: 3, dy: -4},
        {dx: 4, dy: -3}, {dx: 4, dy: -1}, {dx: 4, dy: 1}, {dx: 4, dy: 3}, {dx: 3, dy: 4}, {dx: 1, dy: 4},
        {dx: -1, dy: 4}, {dx: -3, dy: 4}, {dx: -5, dy: 4}, {dx: -5, dy: 3}, {dx: -5, dy: 2}, {dx: -5, dy: 0},
        {dx: -5, dy: -2}, {dx: -5, dy: -3}, {dx: -5, dy: -4}, {dx: -4, dy: -5}, {dx: -3, dy: -5}, {dx: -2, dy: -5},
        {dx: 0, dy: -5}, {dx: 2, dy: -5}, {dx: 3, dy: -5}, {dx: 4, dy: -5}, {dx: 5, dy: -4}, {dx: 5, dy: -3},
        {dx: 5, dy: -2}, {dx: 5, dy: 0}, {dx: 5, dy: 2}, {dx: 5, dy: 3}, {dx: 5, dy: 4}, {dx: 4, dy: 5},
        {dx: 3, dy: 5}, {dx: 2, dy: 5}, {dx: 0, dy: 5}, {dx: -2, dy: 5}, {dx: -3, dy: 5}, {dx: -4, dy: 5}
    ],
    [STRUCTURE_LINK]: [{dx: -1, dy: 2}],
    [STRUCTURE_POWER_SPAWN]: [{dx: 0, dy: 2}],
    [STRUCTURE_RAMPART]: [
        {dx: 0, dy: 0}, {dx: -1, dy: 0}, {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1}, {dx: 1, dy: 0},
        {dx: 1, dy: 1}, {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: -2, dy: 2}, {dx: -2, dy: 1}, {dx: -2, dy: 0},
        {dx: -2, dy: -1}, {dx: -2, dy: -2}, {dx: -1, dy: -2}, {dx: 0, dy: -2}, {dx: 1, dy: -2}, {dx: 2, dy: -2},
        {dx: 2, dy: -1}, {dx: 2, dy: 0}, {dx: 2, dy: 1}, {dx: 2, dy: 2}, {dx: 1, dy: 2}, {dx: 0, dy: 2},
        {dx: -1, dy: 2}, {dx: -1, dy: 3}, {dx: -2, dy: 3}, {dx: -3, dy: 2}, {dx: -3, dy: 1}, {dx: -3, dy: -1},
        {dx: -3, dy: -2}, {dx: -2, dy: -3}, {dx: -1, dy: -3}, {dx: 1, dy: -3}, {dx: 2, dy: -3}, {dx: 3, dy: -2},
        {dx: 3, dy: -1}, {dx: 3, dy: 1}, {dx: 3, dy: 2}, {dx: 2, dy: 3}, {dx: 1, dy: 3}
    ],
    [STRUCTURE_ROAD]: [
        {dx: -1, dy: 0}, {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1}, {dx: 1, dy: 0}, {dx: 1, dy: 1},
        {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: -2, dy: 2}, {dx: -2, dy: -2}, {dx: 2, dy: -2}, {dx: 2, dy: 2},
        {dx: 0, dy: 3}, {dx: -3, dy: 3}, {dx: -3, dy: 0}, {dx: -3, dy: -3}, {dx: 0, dy: -3}, {dx: 3, dy: -3},
        {dx: 3, dy: 0}, {dx: 3, dy: 3}, {dx: 2, dy: 4}, {dx: 0, dy: 4}, {dx: -2, dy: 4}, {dx: -4, dy: 4},
        {dx: -4, dy: 2}, {dx: -4, dy: 0}, {dx: -4, dy: -2}, {dx: -4, dy: -4}, {dx: -2, dy: -4}, {dx: 0, dy: -4},
        {dx: 2, dy: -4}, {dx: 4, dy: -4}, {dx: 4, dy: -2}, {dx: 4, dy: 0}, {dx: 4, dy: 2}, {dx: 4, dy: 4},
        {dx: 5, dy: 5}, {dx: 1, dy: 5}, {dx: -1, dy: 5}, {dx: -5, dy: 5}, {dx: -5, dy: 1}, {dx: -5, dy: -1},
        {dx: -5, dy: -5}, {dx: -1, dy: -5}, {dx: 1, dy: -5}, {dx: 5, dy: -5}, {dx: 5, dy: -1}, {dx: 5, dy: 1}
    ],
    [STRUCTURE_SPAWN]: [{dx: -2, dy: 0}, {dx: 0, dy: -2}, {dx: 2, dy: 0}],
    [STRUCTURE_STORAGE]: [{dx: 0, dy: 0}],
    [STRUCTURE_TERMINAL]: [{dx: 1, dy: 2}],
    [STRUCTURE_TOWER]: [{dx: -2, dy: 1}, {dx: -2, dy: -1}, {dx: -1, dy: -1}, {dx: 1, dy: -2}, {dx: 2, dy: -1}, {dx: -2, dy: 1}]
};

function calculateOptimalPosition (room: Room, minWallDist: number, controllerWeight: number, exitWeight: number, sourceWeight: number): {x: number, y: number} {
    // Warning, can take between 5 and 30 cpu, usually around 12. Run rarely.
    // For placing the center of a bunker one might use: calculateOptimalPosition(room, 5, 0.5, -1, 1);

    const terrain: RoomTerrain = room.getTerrain();
    const sources = _.map(room.find(FIND_SOURCES), (source) => source.pos);
    if(!room.controller) {
        return {x: -1, y: -1};
    }
    const controller: RoomPosition = room.controller.pos;
    const myMap: Array<Array<{exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number}>> = [];
    
    const exitQueue = [];
    const wallQueue = [];
    const queue = [];

    for(let x = 0; x < 50; x++) {
        myMap.push([]);
        for(let y = 0; y < 50; y++) {
            const tempTerrain: {exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number} = {exitDist: -1, wallDist: -1, sourceDist: [], controllerDist: -1};
            
            if((x === 0 || y === 0 || x === 49 || y === 49) && terrain.get(x, y) === 0) {
                tempTerrain.exitDist = 0;
                exitQueue.unshift({'x': x, 'y': y});

                tempTerrain.wallDist = 0;
                wallQueue.unshift({'x': x, 'y': y});
            }

            if(terrain.get(x, y) === TERRAIN_MASK_WALL) {
                tempTerrain.wallDist = 0;
                wallQueue.unshift({'x': x, 'y': y});
            }
            
            tempTerrain.sourceDist = [];
            for(const i in sources){
                if(x === sources[i].x && y === sources[i].y){
                    tempTerrain.sourceDist.push(0);
                }
                else {
                    tempTerrain.sourceDist.push(-1);
                }
            }
            
            if(x === controller.x && y === controller.y) {
                tempTerrain.controllerDist = 0;
            }
            
            myMap[x].push(tempTerrain);
        }
    }
    
    while(exitQueue.length > 0) {
        const pos: {x: number, y: number} | undefined = exitQueue.pop();
        if(!pos) { continue; }
        const current = myMap[pos.x][pos.y].exitDist;

        for(let dx = -1; dx <= 1; dx++) {
            const x: number = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                const y: number = pos.y + dy;
                
                if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist !== 0 && myMap[x][y].exitDist < 0) {
                    myMap[x][y].exitDist = current + 1;
                    exitQueue.unshift({'x': x, 'y': y});
                }
            }
        }
    }
    
    while(wallQueue.length > 0) {
        const pos: {x: number, y: number} | undefined = wallQueue.pop();
        if(!pos) { continue; }
        const current = myMap[pos.x][pos.y].wallDist;

        for(let dx = -1; dx <= 1; dx++) {
            const x: number = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                const y: number = pos.y + dy;
                
                if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist < 0) {
                    myMap[x][y].wallDist = current + 1;
                    wallQueue.unshift({'x': x, 'y': y});
                }
            }
        }
    }

    queue.unshift({x: controller.x, y: controller.y});
    while(queue.length > 0) {
        const pos: {x: number, y: number} | undefined = queue.pop();
        if(!pos) { continue; }
        const current = myMap[pos.x][pos.y].controllerDist;

        for(let dx = -1; dx <= 1; dx++) {
            const x: number = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                const y: number = pos.y + dy;
                
                if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist !== 0 && myMap[x][y].controllerDist < 0) {
                    myMap[x][y].controllerDist = current + 1;
                    queue.unshift({'x': x, 'y': y});
                }
            }
        }
    }
    
    for(const i in sources) {
        queue.unshift({x: sources[i].x, y: sources[i].y});
        while(queue.length > 0) {
            const pos: {x: number, y: number} | undefined = queue.pop();
            if(!pos) { continue; }
            const current = myMap[pos.x][pos.y].sourceDist[i];
    
            for(let dx = -1; dx <= 1; dx++) {
                const x: number = pos.x + dx;
                for(let dy = -1; dy <= 1; dy++) {
                    const y: number = pos.y + dy;
                    
                    if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist !== 0 && myMap[x][y].sourceDist[i] < 0) {
                        myMap[x][y].sourceDist[i] = current + 1;
                        queue.unshift({'x': x, 'y': y});
                    }
                }
            }
        }
    }

    const minPos = {x: -1, y: -1};
    let minScore = 0;

    for(let x = 0; x < 50; x++) {
        for(let y = 0; y < 50; y++) {
            if(myMap[x][y].wallDist >= minWallDist) {
                const score = (controllerWeight * (myMap[x][y].controllerDist * myMap[x][y].controllerDist)) + (exitWeight * myMap[x][y].exitDist) + (sourceWeight * _.sum(_.map(myMap[x][y].sourceDist, (dist) => (1 / sources.length) * (dist * dist))));
                if(score < minScore || minPos.x < 0) {
                    minScore = score;
                    minPos.x = x;
                    minPos.y = y;
                }
            }
        }
    }
    
    return minPos;
}
