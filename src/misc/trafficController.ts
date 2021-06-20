import { getSpotsNear, movePos } from './mapFunctions';
import { drawPath } from './visuals';
import { PathingCallbackOptions, getPathfinderCallback } from './pathingCallbacks';

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
                            options: PathingCallbackOptions | undefined): number {
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
            let freeGoalsInRange: { pos: RoomPosition, range: number }[] = [];

            if(options?.range && (options.range === 0 || creep.pos.roomName !== targetPos.roomName)) {
                freeGoalsInRange = [{ pos: targetPos, range: options.range}];
            }
            else {
                freeGoalsInRange = _.map(getSpotsNear(targetPos, options?.range), (pos) => {
                    return { pos: pos, range: 0 };
                });
            }

            if(freeGoalsInRange.length === 0) {
                console.log('Attempted to move', creep.name, 'but no open spots could be found.');
                return 0;
            }
            const pathfinderReturn = PathFinder.search(
                creep.pos,
                freeGoalsInRange,
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

        drawPath(creep.pos, path);

        // Find the next step to take on the path.
        let moveDirecton: DirectionConstant | null = null;
        let afterMovePos: string | null = null;
        let progress: number = 0;
        for(let i = path.length - 1; i >= 0; i--) {
            const step = path[i];
            if(creep.pos.isNearTo(step.x, step.y)) {
                progress = Number(i);
                moveDirecton = creep.pos.getDirectionTo(step.x, step.y);
                afterMovePos = constructPositionString(new RoomPosition(step.x, step.y, creep.pos.roomName));
                break;
            }
        }

        if(moveDirecton && afterMovePos) {
            creepMoveInfo.registeredMovement = moveDirecton;
            this.movingCreeps.set(afterMovePos, currentPosString);
        }
        else {
            console.log('Attempted to move', creep.name, 'but it was off of the path.');
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

        this.movingCreeps.clear();
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

        if(!movementInfo.registeredMovement) {
            if(!forceMove) {
                // The creep doesn't need to move.
                return true;
            }

            const allSpots = getSpotsNear(movementInfo.creep.pos, /*range=*/1, /*considerCreeps=*/false);
            const freeSpots = _.filter(allSpots,
                                       (pos) => {
                                            const fromString = this.movingCreeps.get(constructPositionString(pos));
                                            return pos !== movementInfo.creep.pos && (!fromString || fromString === oldPosString);
                                        });
            let newPos: RoomPosition | undefined = _.sample(_.filter(freeSpots, (pos) => !this.creeps.has(constructPositionString(pos))));
            if(!newPos) {
                newPos = _.sample(_.filter(freeSpots, (pos) => {
                    const creepsEntry = this.creeps.get(constructPositionString(pos));
                    return !creepsEntry || (creepsEntry.registeredMovement && canMove(creepsEntry.creep));
                }));
            }
            if(!newPos) {
                newPos = _.sample(_.filter(freeSpots, (pos) => {
                    const creepsEntry = this.creeps.get(constructPositionString(pos));
                    return !creepsEntry || (!creepsEntry.moved && canMove(creepsEntry.creep));
                }));
            }
            if(!newPos) {
                console.log('Attempted to push', movementInfo.creep.name, 'but no spots were available.');
                return false;
            }

            movementInfo.registeredMovement = movementInfo.creep.pos.getDirectionTo(newPos.x, newPos.y);
        }

        const newPosString = constructPositionString(movePos(movementInfo.creep.pos, movementInfo.registeredMovement));
        const moveDirecton = movementInfo.registeredMovement;

        const conflictingCreepPos = this.movingCreeps.get(newPosString);
        if(conflictingCreepPos && conflictingCreepPos !== oldPosString) {
            // Someone else is moving into that spot.
            console.log('Attempted to finalize move for', movementInfo.creep.name, 'but another creep was moving into the same spot.');
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
            console.log('Attempted to finalize move for', movementInfo.creep.name, 'but it failed to move the blocking creep.');
            movementInfo.moved = false;
            if(this.movingCreeps.get(newPosString) === oldPosString) {
                this.movingCreeps.delete(newPosString)
            }
            return false;
        }

        if(movementInfo.creep.move(moveDirecton) !== OK) {
            console.log('Attempted to finalize move for', movementInfo.creep.name, 'but it failed due to non-OK status.');
            movementInfo.moved = false;
            if(this.movingCreeps.get(newPosString) === oldPosString) {
                this.movingCreeps.delete(newPosString)
            }
            return false;
        }
        return true;
    }
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

function canMove(creep: Creep): boolean {
    return creep.getActiveBodyparts(MOVE) > 0 && !(creep.fatigue > 0);
}
