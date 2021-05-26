import { OWN_NAME, SOURCE_KEEPER_NAME } from "./constants";
import { addRoomInfo, getRoomInfo } from "./mapFunctions";

/**
 * The format for various options which can be provided to customize callbacks.
 * range - The required range to the target, defaults to 1
 */
 export interface PathingCallbackOptions {
    range?: number;
    maxOps?: number;
}

/**
 * Returns a pathfinder callback based on the provided options.
 * @param {PathingCallbackOptions} options - The pathing options to use
 * @returns {(roomName: string) => false | CostMatrix} - A callback suitable for using with Pathfinder
 */
export function getPathfinderCallback(options: PathingCallbackOptions | undefined):
                                      (roomName: string) => false | CostMatrix {
    // TODO(Daniel): Incorperate the options.
    return standardCallback;
}

/**
 * Returns a room callback based on the provided options.
 * @param {PathingCallbackOptions} options - The pathing options to use
 * @returns {(roomName: string) => number} - A callback suitable for using with map.findRoute
 */
export function getRoomCallback(options: PathingCallbackOptions | undefined):
                                (roomName: string) => number {
    // TODO(Daniel): Incorperate the options.
    return (roomName: string) => { return 1; };
}

const COSTMATRIX_STALENESS_THRESHOLD = 50;

function standardCallback(roomName: string): false | CostMatrix {
    if(!global.myCosts) {
        global.myCosts = {};
    }

    const roomInfo = getRoomInfo(roomName);
    if((!roomInfo || Game.time - roomInfo.lastObserved > COSTMATRIX_STALENESS_THRESHOLD) && Game.rooms[roomName]) {
        addRoomInfo(Game.rooms[roomName]); // record the room
    }
    else if(roomInfo && roomInfo.owner && roomInfo.owner !== OWN_NAME && roomInfo.level > 2) {
        return false; // don't go in rooms that could have towers
    }

    // set up the costs of things that shouldn't change very often
    let costs: CostMatrix;
    if(global.myCosts[roomName] && Game.time - global.myCosts[roomName].time <= COSTMATRIX_STALENESS_THRESHOLD) {
        costs = global.myCosts[roomName].mat.clone(); // used the cached one
    }
    else if(Game.rooms[roomName]) {
        costs = new PathFinder.CostMatrix(); // generate and cache
        let obstacles: Array<Structure | ConstructionSite> = Game.rooms[roomName].find(FIND_STRUCTURES);
        obstacles = obstacles.concat(Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES))

        for(const structure of obstacles) {
            if (structure.structureType === STRUCTURE_ROAD) {
                // Favor roads over swamp and wall (if there are roads over those things)
                costs.set(structure.pos.x, structure.pos.y, 1);
            } else if (structure.structureType !== STRUCTURE_CONTAINER && (structure.structureType !== STRUCTURE_RAMPART || !(structure as StructureRampart).my)) {
                // Can't walk through non-walkable buildings
                costs.set(structure.pos.x, structure.pos.y, 0xff);
            }
        }

        for(const source of Game.rooms[roomName].find(FIND_SOURCES)) {
            for(const creep of source.pos.findInRange(FIND_MY_CREEPS, 1)) {
                // Really try to avoid walking through harvesters and interrupting them
                costs.set(creep.pos.x, creep.pos.y, 0xfe);
            }
        }

        global.myCosts[roomName] = {mat: costs, time: Game.time};
        costs = costs.clone();
    }
    else if(global.myCosts[roomName]) {
        costs = global.myCosts[roomName].mat.clone(); // used the cached one, even though it's old
    }
    else {
        costs = new PathFinder.CostMatrix();
    }

    // set up the cost of enemy creeps
    if(Game.rooms[roomName]) {
        for(const creep of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS)) {
            if(creep.owner.username === SOURCE_KEEPER_NAME) {
                for(let dx = -3; dx <= 3; dx++) {
                    if(creep.pos.x + dx >= 0 && creep.pos.x + dx < 50) {
                        for(let dy = -3; dy <= 3; dy++) {
                            if(creep.pos.y + dy >= 0 && creep.pos.y + dy < 50) {
                                costs.set(creep.pos.x + dx, creep.pos.y + dy, 0xff);
                            }
                        }
                    }
                }
            }
            else {
                costs.set(creep.pos.x, creep.pos.y, 0xff);
            }
        }
    }

    return costs;
}
