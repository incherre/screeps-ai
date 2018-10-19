export function shuffle(a: any[]): void {
    let j: number;
    let item: any;
    for(let i = shuffle.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        item = a[j];
        a[j] = a[i];
        a[i] = item;
    }
}

export function getSpotsNear(position: RoomPosition, range:number = 1): RoomPosition[] {
    if(Game.rooms[position.roomName]) {
        const room = Game.rooms[position.roomName];
        const potentialTargets: RoomPosition[] = [];

        const objects = room.lookAtArea(position.y - range, position.x - range, position.y + range, position.x + range, false);
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