import { OWN_NAME, ROOM_SIZE, SOURCE_KEEPER_ATTACK_RANGE, SOURCE_KEEPER_NAME } from "./constants";
import { addRoomInfo, getRoomInfo } from "./mapFunctions";

/**
 * The format for various options which can be provided to customize callbacks.
 * range - The required range to the target, defaults to 1
 */
 export interface PathingCallbackOptions {
    range?: number;
    maxOps?: number;
    walkNearSources?: boolean;
}

/**
 * Returns a pathfinder callback based on the provided options.
 * @param {PathingCallbackOptions} options - The pathing options to use
 * @returns {(roomName: string) => false | CostMatrix} - A callback suitable for using with Pathfinder
 */
export function getPathfinderCallback(options: PathingCallbackOptions | undefined):
                                      (roomName: string) => false | CostMatrix {
    if(!options?.walkNearSources) {
        return (roomName: string): false | CostMatrix => {
            let costs = standardPathfindingCallback(roomName);
            if(!costs) {
                return false;
            }

            if(Game.rooms[roomName]) {
                for(const source of Game.rooms[roomName].find(FIND_SOURCES)) {
                    for(const creep of source.pos.findInRange(FIND_MY_CREEPS, 1)) {
                        // Really try to avoid walking through harvesters and interrupting them.
                        costs.set(creep.pos.x, creep.pos.y, 0xfe);
                    }
                }
            }

            return costs;
        };
    }
    else {
        return standardPathfindingCallback;
    }
}

/**
 * Returns a room callback based on the provided options.
 * @param {PathingCallbackOptions} options - The pathing options to use
 * @returns {(roomName: string) => number} - A callback suitable for using with map.findRoute
 */
export function getRoomCallback(options: PathingCallbackOptions | undefined):
                                (roomName: string) => number {
    // TODO(Daniel): Incorperate the options.
    return standardRoomCallback;
}

const COSTMATRIX_STALENESS_THRESHOLD = 1500;
const SOURCE_AVOID_DISTANCE = 1;

function standardRoomCallback(roomName: string): number {
    if(!global.myRoomCosts) {
        global.myRoomCosts = {};
    }
    if(global.myRoomCosts[roomName] && Game.time - global.myRoomCosts[roomName].time <= COSTMATRIX_STALENESS_THRESHOLD) {
        // Use the cached cost.
        return global.myRoomCosts[roomName].cost;
    }

    const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
    const match = coordinateRegex.exec(roomName);
    if(match === null) {
        // Room name isn't valid.
        global.myRoomCosts[roomName] = { cost: Infinity, time: Game.time };
        return Infinity;
    }

    const x = Number(match[2]);
    const y = Number(match[4]);
    if(x % 10 === 0 || y % 10 === 0) {
        // Highway room.
        global.myRoomCosts[roomName] = { cost: 1, time: Game.time };
        return 1;
    }
    else if (x % 10 >= 4 && x % 10 <= 6 && y % 10 >= 4 && y % 10 <= 6) {
        // Sector core, has source keepers and potentially invader cores.
        global.myRoomCosts[roomName] = { cost: 2, time: Game.time };
        return 2;
    }

    const roomInfo = getRoomInfo(roomName);
    if((!roomInfo || Game.time - roomInfo.lastObserved > COSTMATRIX_STALENESS_THRESHOLD) && Game.rooms[roomName]) {
        addRoomInfo(Game.rooms[roomName]); // record the room
    }

    const roomOwner = (roomInfo && roomInfo.owner) ? roomInfo.owner : '';
    const roomLevel = roomInfo ? roomInfo.level : 0;
    if(roomOwner !== OWN_NAME && roomLevel > 2) {
        // Don't go in rooms that could have towers.
        global.myRoomCosts[roomName] = { cost: Infinity, time: Game.time };
        return Infinity;
    }
    else if (roomOwner === OWN_NAME) {
        // Our own rooms.
        global.myRoomCosts[roomName] = { cost: 1, time: Game.time };
        return 1;
    }

    global.myRoomCosts[roomName] = { cost: 1.5, time: Game.time };
    return 1.5;
}

function standardPathfindingCallback(roomName: string): false | CostMatrix {
    if(!global.myPathfinderCosts) {
        global.myPathfinderCosts = {};
    }

    if(standardRoomCallback(roomName) === Infinity) {
        return false;
    }

    // set up the costs of things that shouldn't change very often
    let costs: CostMatrix;
    if(global.myPathfinderCosts[roomName] && Game.time - global.myPathfinderCosts[roomName].time <= COSTMATRIX_STALENESS_THRESHOLD) {
        costs = global.myPathfinderCosts[roomName].mat.clone(); // used the cached one
    }
    else if(Game.rooms[roomName]) {
        costs = new PathFinder.CostMatrix(); // generate and cache
        let obstacles: Array<Structure | ConstructionSite> = Game.rooms[roomName].find(FIND_STRUCTURES);
        obstacles = obstacles.concat(Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES))

        for(const structure of obstacles) {
            if (structure.structureType === STRUCTURE_ROAD) {
                // Favor roads over swamp and wall (if there are roads over those things)
                costs.set(structure.pos.x, structure.pos.y, 1);
            } else if (OBSTACLE_OBJECT_TYPES.includes(structure.structureType as any) || (structure.structureType === STRUCTURE_RAMPART && !(structure as StructureRampart).my)) {
                // Can't walk through non-walkable buildings
                costs.set(structure.pos.x, structure.pos.y, 0xff);
            }
        }

        global.myPathfinderCosts[roomName] = {mat: costs, time: Game.time};
        costs = costs.clone();
    }
    else if(global.myPathfinderCosts[roomName]) {
        costs = global.myPathfinderCosts[roomName].mat.clone(); // used the cached one, even though it's old
    }
    else {
        costs = new PathFinder.CostMatrix();
    }

    // set up the cost of enemy creeps
    if(Game.rooms[roomName]) {
        for(const creep of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS)) {
            if(creep.owner.username === SOURCE_KEEPER_NAME) {
                for(let dx = -SOURCE_KEEPER_ATTACK_RANGE; dx <= SOURCE_KEEPER_ATTACK_RANGE; dx++) {
                    if(creep.pos.x + dx >= 0 && creep.pos.x + dx < ROOM_SIZE) {
                        for(let dy = -SOURCE_KEEPER_ATTACK_RANGE; dy <= SOURCE_KEEPER_ATTACK_RANGE; dy++) {
                            if(creep.pos.y + dy >= 0 && creep.pos.y + dy < ROOM_SIZE) {
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
