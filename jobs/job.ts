export abstract class Job {
    public abstract recalculateTarget(creep: Creep): boolean;
    public abstract getJobType(): string;
    public abstract getJobInfo(): string;
    public abstract do(creep: Creep): void;

    public priority: number;
    public ttr: number;
    public target: RoomPosition | null;

    constructor () {
        this.priority = 0;
        this.ttr = 0;
        this.target = null;
    }

    public static getSpotsNear(position: RoomPosition, range:number = 1): RoomPosition[] {
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
}
