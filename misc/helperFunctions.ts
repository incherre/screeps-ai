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
        const struct = _.find(Game.structures);
        if(struct && (struct as OwnedStructure).my) {
            Memory.username = (struct as OwnedStructure).owner.username;
            return Memory.username;
        }
        else {
            return '';
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
        info.owner = 'Source Keeper';
    }

    Memory.seenRooms[room.name] = info;
}

export function getRoomInfo(roomName: string): {owner: string | null, level: number, lastObserved: number} | undefined {
    if(!Memory.seenRooms) {
        Memory.seenRooms = {};
    }

    return Memory.seenRooms[roomName];
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
                for(const i in objects[y][x]) {
                    if(objects[y][x][i].type === 'creep') {
                        blocked = true;
                        break;
                    }
                    else if(objects[y][x][i].type === 'terrain' && objects[y][x][i].terrain === 'wall') {
                        blocked = true;
                        break;
                    }
                    else if(objects[y][x][i].type === 'structure') {
                        const structure = objects[y][x][i].structure;
                        if(structure && OBSTACLE_OBJECT_TYPES.indexOf(structure.structureType as "wall") >= 0){
                            // TODO:(Daniel) figure out if the above being necessary is actually a bug in typed-screeps, or if I'm doing something wrong
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
