import { SOURCE_KEEPER_NAME } from './constants';

/**
 * Computes the names of the rooms directly accessible from a particular room.
 * @param {string} roomName - The name of the room to calculate the exits of
 * @returns {string[]} - An array of room names
 */
export function getAdjacentRooms(roomName: string): string[] {
    const roomNames: string[] = [];
    const exits = Game.map.describeExits(roomName);
    if(exits) {
        // exits will be undefined in the simulation room
        for(const exitRoomName of Object.values(exits)) {
            if(exitRoomName) {
                roomNames.push(exitRoomName);
            }
        }
    }
    return roomNames;
}

/**
 * Records in memory various stats about the room.
 * @param {Room} room - The room object to record
 */
export function addRoomInfo(room: Room): void {
    if(!Memory.seenRooms) {
        Memory.seenRooms = {};
    }

    const info: {owner: string | null, level: number, lastObserved: number} = {owner: null, level: 0, lastObserved: Game.time};

    if(room.controller) {
        info.level = room.controller.level;

        if(room.controller.owner) {
            info.owner = room.controller.owner.username;
        }
        else if(room.controller.reservation) {
            info.owner = room.controller.reservation.username;
        }
    }
    else if(room.find(FIND_STRUCTURES, {filter: (struct) => struct.structureType === STRUCTURE_KEEPER_LAIR}).length > 0) {
        info.owner = SOURCE_KEEPER_NAME;
    }

    Memory.seenRooms[room.name] = info;
}

/**
 * Retrieve the previously recorded information about a room, if available.
 * @param {string} roomName - The name of the room
 * @returns - An object representing the room with various properties
 */
export function getRoomInfo(roomName: string): {owner: string | null, level: number, lastObserved: number} | undefined {
    if(!Memory.seenRooms) {
        Memory.seenRooms = {};
    }

    return Memory.seenRooms[roomName];
}

/**
 * Computes a new room position that would result from moving.
 * @param {RoomPosition} position - The current position to move from
 * @param {DirectionConstant} direction - The direction to move in
 * @returns {RoomPosition} - The new room position
 */
export function movePos(position: RoomPosition, direction: DirectionConstant): RoomPosition {
    let x = position.x;
    let y = position.y;

    if(direction === TOP_RIGHT || direction === RIGHT || direction === BOTTOM_RIGHT) {
        x++;
    }
    else if(direction === BOTTOM_LEFT || direction === LEFT || direction === TOP_LEFT) {
        x--;
    }

    if(direction === TOP_LEFT || direction === TOP || direction === TOP_RIGHT) {
        y--;
    }
    else if(direction === BOTTOM_RIGHT || direction === BOTTOM || direction === BOTTOM_LEFT) {
        y++;
    }

    return new RoomPosition(x, y, position.roomName);
}

/**
 * Compute the list of unblocked spaces in range to a position.
 * @param {RoomPosition} position - The target postion
 * @param {number?} range - The range to check, defaults to 1
 * @returns {RoomPosition[]} - A list of free positions in range of the target
 */
export function getSpotsNear(position: RoomPosition, range: number = 1, considerCreeps: boolean = true): RoomPosition[] {
    if(Game.rooms[position.roomName]) {
        const room = Game.rooms[position.roomName];
        const potentialTargets: RoomPosition[] = [];
        const minY = Math.max(position.y - range, 1);
        const minX = Math.max(position.x - range, 1);
        const maxY = Math.min(position.y + range, 48);
        const maxX = Math.min(position.x + range, 48);

        const objects = room.lookAtArea(minY, minX, maxY, maxX, /*asArray=*/false);
        for(const y in objects) {
            for(const x in objects[y]) {
                let blocked = false;
                for(const object of objects[y][x]) {
                    if(object.type === 'creep' && considerCreeps) {
                        blocked = true;
                        break;
                    }
                    else if (object.type === 'constructionSite') {
                        const constructionSite = object.constructionSite;
                        if(constructionSite && OBSTACLE_OBJECT_TYPES.includes(constructionSite.structureType as any)) {
                            blocked = true;
                            break;
                        }
                    }
                    else if(object.type === 'terrain' && object.terrain === 'wall') {
                        blocked = true;
                        break;
                    }
                    else if(object.type === 'structure') {
                        const structure = object.structure;
                        if(structure && OBSTACLE_OBJECT_TYPES.includes(structure.structureType as any)){
                            blocked = true;
                            break;
                        }
                    }
                }

                if(!blocked) {
                    potentialTargets.push(new RoomPosition(Number(x), Number(y), room.name))
                }
            }
        }

        return potentialTargets;
    }
    else {
        return [];
    }
}

/**
 * A heuristic function to compute if a creep ought to be replaced.
 * @param {Creep} creep - The creep which may be old
 * @param {string} spawnRoomName - The name of the room which will replace this creep
 * @returns {boolean} - Whether the replacement creep should start spawning now
 */
export function creepNearDeath(creep: Creep, spawnRoomName: string): boolean {
    const ticksPerStep = Math.ceil(creep.body.length / (creep.getActiveBodyparts(MOVE) * 2));
    const spawnTime = CREEP_SPAWN_TIME * creep.body.length;
    const walkDistanceEstimate = (Game.map.getRoomLinearDistance(creep.pos.roomName, spawnRoomName) + 0.5) * 50;
    const walkTime = ticksPerStep * walkDistanceEstimate;

    if(creep.ticksToLive && creep.ticksToLive < (spawnTime + walkTime)) {
        const nearestSpawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
        if(nearestSpawn && creep.ticksToLive <= (spawnTime + (creep.pos.getRangeTo(nearestSpawn) * ticksPerStep))) {
            return true;
        }
        else if(!nearestSpawn) {
            return true;
        }
    }

    return false;
}

/**
 * Finds the center room of the current sector in which portals sometimes spawn.
 * @param {string} roomName - The name of any room in the current sector
 * @returns {string | false} - The name of the center room or false if there was an error
 */
export function getNearbyPortalRoom(roomName: string): string | false {
    const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
    const match = coordinateRegex.exec(roomName);
    if(match === null) {
        return false;
    }

    const x = Number(match[2]) - (Number(match[2]) % 10) + 5;
    const y = Number(match[4]) - (Number(match[4]) % 10) + 5;
    return ''.concat(match[1], x.toString(), match[3], y.toString());
}
