import { SOURCE_KEEPER_NAME, OWN_NAME } from './constants';
import { getRoomInfo, addRoomInfo, getSpotsNear, movePos } from './mapFunctions';

/**
 * A class for managing all pathfinding and creep traffic management. Callers will register
 * movement with this class throughout the tick, then at the end of the tick, all the moves
 * will be 'resolved' and finalized by a function call in main.
 */
export class TrafficController {
    /**
     * Get the global singular instance of the TrafficController.
     * @returns {TrafficController} - The global instance of the traffic controller.
     */
    public static getTrafficController(): TrafficController {
        if(!(global.trafficController instanceof TrafficController)) {
            global.trafficController = new TrafficController();
        }

        return global.trafficController;
    }

    /**
     * Registers a creep as moving to a particular target.
     * @param creep - The creep to move
     * @param targetPos - The target to move to
     * @param options - The options for how to move and what to consider
     * @returns - The length of the path remaining to travel
     */
    public registerMovement(creep: Creep, targetPos: RoomPosition,
                            options: TrafficControllerOptions | undefined): number {
        this.sortCreeps();
        const currentPosString: string = constructPositionString(creep.pos);
        const creepMoveInfo: CreepMovementInfo | undefined = this.creeps.get(currentPosString);
        if(!creepMoveInfo) {
            console.log('Attempted to move', creep.name, 'but it wasn\'t in the map.');
            return 0;
        }
        if(creep.name !== creepMoveInfo.creep.name) {
            console.log('Attempted to move', creep.name, 'but found', creepMoveInfo.creep.name, 'instead.');
            return 0;
        }

        let path: PathStep[] = [];
        if(creep.memory.path) {
            // Get the path from memory.
            path = Room.deserializePath(creep.memory.path);
        }

        if(path.length === 0) {
            // Recalculate and save the path.
            const freePositionInRange: RoomPosition | undefined = _.sample(getSpotsNear(targetPos, options?.range));
            if(!freePositionInRange) {
                console.log('Attempted to move', creep.name, 'but no open spots could be found.');
                return 0;
            }
            const pathfinderReturn = PathFinder.search(
                creep.pos,
                {
                    pos: freePositionInRange,
                    range: 0,
                },
                {
                    roomCallback: getPathfinderCallback(options),
                    maxOps: options?.maxOps,
                });

            if(pathfinderReturn.incomplete) {
                console.log('Pathfinder returned incomplete for creep:', creep.name);
                return 0;
            }

            path = convertPath([creep.pos].concat(pathfinderReturn.path));
            creep.memory.path = Room.serializePath(path);
        }

        // Find the next step to take on the path.
        let moveDirecton: DirectionConstant | null = null;
        let afterMovePos: string | null = null;
        let progress: number = 0;
        for(const i in path) {
            const step = path[i];
            if(step.x - step.dx === creep.pos.x && step.y - step.dy === creep.pos.y) {
                progress = Number(i);
                moveDirecton = step.direction;
                afterMovePos = constructPositionString(new RoomPosition(step.x, step.y, creep.pos.roomName));
                break;
            }
        }

        if(moveDirecton && afterMovePos) {
            creepMoveInfo.registeredMovement = moveDirecton;
            this.movingCreeps.set(afterMovePos, currentPosString);
        }
        else {
            console.log('Attempted to move', creep.name, 'but no path was found.');
            return 0;
        }

        return path.length - progress;
    }

    /**
     * Moves all creeps with registered moves, and tries to unblock them if they are blocked
     * by a creep that could get out of the way.
     */
    public finalizeMoves(): void {
        for(const oldPosString of this.creeps.keys()) {
            this.moveFromPosition(oldPosString, /*forceMove=*/false);
        }
    }

    private creeps: Map<string, CreepMovementInfo>;
    private movingCreeps: Map<string, string>;
    private lastMapTick: number = -Infinity;

    private constructor() {
        this.creeps = new Map<string, CreepMovementInfo>();
        this.movingCreeps = new Map<string, string>();
    }

    private sortCreeps(): void {
        if(this.lastMapTick >= Game.time) {
            // Only sort creeps once per tick, at most.
            return;
        }

        this.creeps.clear();
        for(const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            const creepPos = constructPositionString(creep.pos);
            this.creeps.set(creepPos, {
                creep: creep,
                moved: false,
            });
        }
        this.lastMapTick = Game.time;
    }

    private moveFromPosition(oldPosString: string, forceMove: boolean): boolean {
        const movementInfo = this.creeps.get(oldPosString);
        if(!movementInfo || movementInfo.moved) {
            // No creep is here or the creep has already moved, okay to move into this spot.
            return true;
        }

        let newPosString: string = '';
        let moveDirecton: DirectionConstant | null = null;
        if(!movementInfo.registeredMovement) {
            if(!forceMove) {
                // The creep doesn't need to move.
                return true;
            }

            const freeSpots = _.filter(getSpotsNear(movementInfo.creep.pos, /*range=*/1, /*considerCreeps=*/false),
                                       (pos) => !this.movingCreeps.has(constructPositionString(pos)));
            let newPos = _.find(freeSpots, (pos) => !this.creeps.has(constructPositionString(pos)));
            if(!newPos) {
                newPos = _.find(freeSpots, (pos) => {
                    const creepsEntry = this.creeps.get(constructPositionString(pos));
                    return !creepsEntry || creepsEntry.registeredMovement;
                });
            }
            if(!newPos) {
                newPos = _.find(freeSpots, (pos) => {
                    const creepsEntry = this.creeps.get(constructPositionString(pos));
                    return !creepsEntry || !creepsEntry.moved;
                });
            }
            if(!newPos) {
                return false;
            }

            newPosString = constructPositionString(newPos);
            moveDirecton = movementInfo.creep.pos.getDirectionTo(newPos.x, newPos.y);
        }
        else {
            newPosString = constructPositionString(movePos(movementInfo.creep.pos, movementInfo.registeredMovement));
            moveDirecton = movementInfo.registeredMovement;
        }

        const conflictingCreepPos = this.movingCreeps.get(newPosString);
        if(conflictingCreepPos && conflictingCreepPos !== oldPosString) {
            // Someone else is moving into that spot.
            if(this.movingCreeps.get(newPosString) === oldPosString) {
                this.movingCreeps.delete(newPosString)
            }
            return false;
        }

        // Set this before (potentially) unblocking, to prevent infinite call-stacks.
        movementInfo.moved = true;
        if(!this.movingCreeps.has(newPosString)) {
            this.movingCreeps.set(newPosString, oldPosString);
        }

        const blockingCreepMovementInfo = this.creeps.get(newPosString);
        if(blockingCreepMovementInfo && !blockingCreepMovementInfo.registeredMovement && !this.moveFromPosition(newPosString, /*forceMove=*/true)) {
            // Moving the blocking creep failed, so this creep fails too.
            movementInfo.moved = false;
            if(this.movingCreeps.get(newPosString) === oldPosString) {
                this.movingCreeps.delete(newPosString)
            }
            return false;
        }

        movementInfo.creep.move(moveDirecton);
        return true;
    }
}

/**
 * The format for various options which can be provided to the TrafficController.
 * range - The required range to the target, defaults to 1
 */
export interface TrafficControllerOptions {
    range?: number;
    maxOps?: number;
}

interface CreepMovementInfo {
    creep: Creep;
    registeredMovement?: DirectionConstant;
    moved: boolean;
}

function constructPositionString(pos: RoomPosition): string {
    return [pos.roomName, pos.x, pos.y].join();
}

function convertPath(path: RoomPosition[]): PathStep[] {
    const result: PathStep[] = [];
        for (let i = 0; i + 1 < path.length; i++) {
        const pos = path[i]; // 17, 27
        const rel = path[i + 1]; // 18, 26
        const dir: number = pos.getDirectionTo(rel);

        if (pos.roomName !== rel.roomName) {
            // dir = ((dir + 3) % 8) + 1;
            break;
        }

        result.push({
            direction: dir as DirectionConstant,
            dx: rel.x - pos.x, // 18 - 17 = 1
            dy: rel.y - pos.y, // 26 - 27 = -1
            x: rel.x, // 18
            y: rel.y // 26
        });
    }

    return result;
}

function getPathfinderCallback(options: TrafficControllerOptions | undefined):
                              (roomName: string) => false | CostMatrix {
    // TODO(Daniel): Incorperate the options.
    return standardCallback;
}

const INFO_STALENESS_THRESHOLD = 50;
function standardCallback(roomName: string): false | CostMatrix {
    if(!global.myCosts) {
        global.myCosts = {};
    }

    const roomInfo = getRoomInfo(roomName);
    if((!roomInfo || Game.time - roomInfo.lastObserved > INFO_STALENESS_THRESHOLD) && Game.rooms[roomName]) {
        addRoomInfo(Game.rooms[roomName]); // record the room
    }
    else if(roomInfo && roomInfo.owner && roomInfo.owner !== OWN_NAME && roomInfo.level > 2) {
        return false; // don't go in rooms that could have towers
    }

    // set up the costs of things that shouldn't change very often
    let costs: CostMatrix;
    if(global.myCosts[roomName] && Game.time - global.myCosts[roomName].time <= INFO_STALENESS_THRESHOLD) {
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
