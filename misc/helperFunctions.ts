import { ScreepsRequest } from "../requests/request";

export function shuffle(a: any[]): void {
    let j: number;
    let item: any;
    for(let i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        item = a[j];
        a[j] = a[i];
        a[i] = item;
    }
}

export function popMostImportant(requests: ScreepsRequest[]): ScreepsRequest | null {
    let min = Infinity;
    let index = -1;

    for(let i = 0; i < requests.length; i++) {
        if(requests[i].priority < min) {
            min = requests[i].priority;
            index = i;
        }
    }

    if(min !== Infinity && index >= 0) {
        const request = requests[index];
        requests[index] = requests[requests.length - 1];
        requests.pop();
        return request;
    }
    else {
        return null;
    }
}

export function getOwnName(): string {
    if(Memory.username) {
        return Memory.username;
    }
    else {
        const struct = _.find(Game.structures,
            (structure: Structure) => structure instanceof OwnedStructure && (structure as OwnedStructure).my
            ) as OwnedStructure;
        if(struct && struct.my && struct.owner) {
            Memory.username = struct.owner.username;
            return Memory.username;
        }
        else {
            const creep = _.find(Game.creeps);
            if(creep && creep.my) {
                Memory.username = creep.owner.username;
                return Memory.username;
            }
            else {
                return '';
            }
        }
    }
}

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

export const SOURCE_KEEPER_NAME = 'Source Keeper';

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

export function getRoomInfo(roomName: string): {owner: string | null, level: number, lastObserved: number} | undefined {
    if(!Memory.seenRooms) {
        Memory.seenRooms = {};
    }

    return Memory.seenRooms[roomName];
}

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

export function getSpotsNear(position: RoomPosition, range:number = 1): RoomPosition[] {
    if(Game.rooms[position.roomName]) {
        const room = Game.rooms[position.roomName];
        const potentialTargets: RoomPosition[] = [];
        const minY = Math.max(position.y - range, 1);
        const minX = Math.max(position.x - range, 1);
        const maxY = Math.min(position.y + range, 48);
        const maxX = Math.min(position.x + range, 48);

        const objects = room.lookAtArea(minY, minX, maxY, maxX, false);
        for(const y in objects) {
            for(const x in objects[y]) {
                let blocked = false;
                for(const object of objects[y][x]) {
                    if(object.type === 'creep' || object.type === 'constructionSite') {
                        const constructionSite = object.constructionSite;
                        blocked = !!constructionSite && constructionSite.structureType in OBSTACLE_OBJECT_TYPES;
                        break;
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
