import { Colony } from "./colony";
import { IdleJob } from "./jobs/idleJob";
import { Job } from "./jobs/job";
import { jobTypes } from "./manifest"
import { addRoomInfo, getOwnName, getRoomInfo, getSpotsNear, movePos, shuffle, SOURCE_KEEPER_NAME } from "./misc/helperFunctions";

export class WorkerCreep {
    public parent: Colony;
    public creep: Creep;
    public job: Job;
    public moved: boolean;
    public worked: boolean;

    constructor (creep: Creep, parent: Colony) {
        this.parent = parent;
        this.creep = creep;
        if(jobTypes[creep.memory.jobType]) {
            this.job = jobTypes[creep.memory.jobType](creep.memory.jobInfo);
        }
        else {
            console.log(('Jobtype: "' + creep.memory.jobType + '" not found!').fontcolor('red'));
            this.job = jobTypes.idle('');
        }
        this.moved = false;
        this.worked = false;
    }

    public getOutOfTheWay(incomingWorker: WorkerCreep, swapAllowed: boolean = true): void {
        // see if we can move as we are supposed to
        this.work();

        if(!this.moved && this.creep.fatigue === 0) {
            let retVal: CreepMoveReturnCode = ERR_BUSY;
            let dir: DirectionConstant | null = null;

            if(this.job.target) {
                // try to move toward our target
                dir = this.creep.pos.getDirectionTo(this.job.target);
                let newPos: RoomPosition | null = movePos(this.creep.pos, dir);
                const blockingWorker = this.parent.getWorker(newPos)

                const matrix = standardCallback(this.creep.pos.roomName);
                const terrain = Game.map.getRoomTerrain(this.creep.pos.roomName);
                if((matrix && matrix.get(newPos.x, newPos.y) > 250) || terrain.get(newPos.x, newPos.y) === TERRAIN_MASK_WALL) {
                    // can't move into stuff
                    newPos = null;
                }

                // check if there will be a blocking worker in that direction
                if(blockingWorker) {
                    this.moved = true; // prevent circular moves
                    blockingWorker.getOutOfTheWay(this, false);
                    this.moved = false;
                }
                
                if(newPos && (!blockingWorker || blockingWorker.moved)) {
                    // only move if we think we're in the clear
                    retVal = this.creep.move(dir);
                }
            }

            if(retVal !== OK && swapAllowed) {
                // try to swap places with the incoming creep
                dir = this.creep.pos.getDirectionTo(incomingWorker.creep);
                retVal = this.creep.move(dir);
            }
            else if(retVal !== OK) {
                // just find a random open spot
                const spots = getSpotsNear(this.creep.pos);
                if(spots.length > 0) {
                    shuffle(spots);
                    dir = this.creep.pos.getDirectionTo(spots[0]);
                    retVal = this.creep.move(dir);
                }
            }

            if(retVal === OK) {
                // if we moved, record that we moved
                this.moved = true;
            }
        }
    }

    private moveByPath(path: PathStep[]): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS {
        // first, find the spot that the creep wants to move to
        let targetPos: RoomPosition | null = null;
        for(const step of path) {
            if(step.x - step.dx === this.creep.pos.x && step.y - step.dy === this.creep.pos.y) {
                targetPos = new RoomPosition(step.x, step.y, this.creep.pos.roomName);
                break;
            }
        }

        if(!targetPos) {
            // oh no, we're not on the path
            return ERR_NOT_FOUND;
        }

        // figure out if someone is blocking us
        const blockingWorker = this.parent.getWorker(targetPos);
        if(!blockingWorker) {
            // nothing is blocking us, happy day!
            return this.creep.moveByPath(path);
        }
        
        // give them a chance to move by themselves
        this.creep.say("Beep-beep!")
        blockingWorker.getOutOfTheWay(this);

        if(blockingWorker.moved) {
            // they moved for us!
            return this.creep.moveByPath(path);
        }
        else {
            // they probably didn't move because they were tired...
            return ERR_TIRED;
        }
    }

    private moveTo(targetPos: RoomPosition): CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS {
        // record that we intend to move
        this.moved = true;

        let path: PathStep[] = [];
        let changed: boolean = false;
        let retVal: CreepMoveReturnCode | ERR_NOT_FOUND | ERR_INVALID_ARGS = ERR_NOT_FOUND;

        if(this.creep.memory.path) {
            // get the path from memory
            path = Room.deserializePath(this.creep.memory.path);
            retVal = this.moveByPath(path);
        }

        if(retVal === ERR_NOT_FOUND) {
            // if the path isn't in memory, or the path is wrong generate a new one
            let pathRange = this.job.targetRange;
            if(targetPos.x === 25 && targetPos.y === 25 && targetPos.roomName !== this.creep.pos.roomName) {
                // if the target is at the generic center point of a room, just find a path to pretty much anywhere in the room
                pathRange = 23;
            }

            // find a path to the target
            const pathfinderReturn = PathFinder.search(this.creep.pos, {pos: targetPos, range: pathRange}, {roomCallback: standardCallback});
            if(pathfinderReturn.path.length > 0) {
                path = convertPath([this.creep.pos].concat(pathfinderReturn.path));
                retVal = this.moveByPath(path);
                changed = true;
            }
        }

        if(retVal === ERR_TIRED) { // I use this to mean blocked, probably because a creep on the path was tired
            // repath, but around nearby creeps
            let pathRange = this.job.targetRange;
            if(targetPos.x === 25 && targetPos.y === 25 && targetPos.roomName !== this.creep.pos.roomName) {
                // if the target is at the generic center point of a room, just find a path to pretty much anywhere in the room
                pathRange = 23;
            }

            const creepCallback: (roomName: string) => false | CostMatrix = (roomName: string) => {
                const matrix = standardCallback(roomName);
                if(!matrix) {
                    return false;
                }

                if(roomName === this.creep.pos.roomName) {
                    for(const creep of this.creep.pos.findInRange(FIND_CREEPS, 1)) {
                        matrix.set(creep.pos.x, creep.pos.y, 0xff);
                    }
                }
                return matrix;
            }

            // find a path to the target
            const pathfinderReturn = PathFinder.search(this.creep.pos, {pos: targetPos, range: pathRange}, {roomCallback: creepCallback});
            if(pathfinderReturn.path.length > 0) {
                path = convertPath([this.creep.pos].concat(pathfinderReturn.path));
                retVal = this.moveByPath(path);
                changed = true;
            }
        }

        if(changed) {
            // if a path was found, save it
            this.creep.memory.path = Room.serializePath(path);
            this.job.setTtr(path.length);
        }

        if(retVal === OK) {
            if(path.length === 0 || (this.creep.pos.x === path[path.length - 1].x && this.creep.pos.y === path[path.length - 1].y)) {
                // if the creep is at the end of the path, delete it so a new one will be generated
                this.creep.memory.path = null;
            }

            // draw the path (more nicely than the default, I might add)
            this.creep.room.visual.circle(path[path.length - 1].x, path[path.length - 1].y,
                {radius: 0.35, fill: 'transparent', stroke: '#51ff8b', strokeWidth: .15, opacity: 0.2}
            );
            const poly: Array<[number, number]> = [];
            for(let i = path.length - 1; i >= 0; i--) {
                if(path[i].x === this.creep.pos.x && path[i].y === this.creep.pos.y) {
                    break;
                }
                poly.push([path[i].x, path[i].y]);
            }
            this.creep.room.visual.poly(poly, {fill: 'transparent', stroke: '#51ff8b', lineStyle: 'dashed', strokeWidth: .15, opacity: 0.2});
        }
        else {
            // undo our move intention
            this.moved = false;
        }

        return retVal;
    }

    public work(): void {
        if(this.worked || this.creep.spawning) {
            return;
        }
        this.worked = true;

        if(this.job.ttr <= 0) {
            this.job.ttr = 0;
            if(!this.job.recalculateTarget(this.creep)) {
                this.job = new IdleJob();
            }
        }

        const creepPos = this.creep.pos;
        const targetPos = this.job.target;
        if(targetPos && targetPos.getRangeTo(creepPos) <= this.job.targetRange) {
            this.job.do(this.creep);
        }
        else if(targetPos && this.creep.fatigue === 0 && this.moveTo(targetPos) === OK) {
            this.job.ttr--;
        }

        this.save();
    }

    public save(): void {
        this.creep.memory.jobType = this.job.getJobType();
        this.creep.memory.jobInfo = this.job.getJobInfo();
    }
}

const renewRoomInfo = 50;
function standardCallback(roomName: string): false | CostMatrix {
    if(!global.myCosts) {
        global.myCosts = {};
    }

    const roomInfo = getRoomInfo(roomName);
    if((!roomInfo || Game.time - roomInfo.lastObserved > renewRoomInfo) && Game.rooms[roomName]) {
        addRoomInfo(Game.rooms[roomName]); // record the room
    }
    else if(roomInfo && roomInfo.owner && roomInfo.owner !== getOwnName() && roomInfo.level > 2) {
        return false; // don't go in rooms that could have towers
    }

    // set up the costs of things that shouldn't change very often
    let costs: CostMatrix;
    if(global.myCosts[roomName] && Game.time - global.myCosts[roomName].time <= renewRoomInfo) {
        costs = global.myCosts[roomName].mat.clone(); // used the cached one
    }
    else if(Game.rooms[roomName]) {
        costs = new PathFinder.CostMatrix(); // generate and cache
        for(const structure of Game.rooms[roomName].find(FIND_STRUCTURES)) {
            if (structure.structureType === STRUCTURE_ROAD) {
                // Favor roads over swamp and wall (if there are roads over those things)
                costs.set(structure.pos.x, structure.pos.y, 1);
            } else if (structure.structureType !== STRUCTURE_CONTAINER && (structure.structureType !== STRUCTURE_RAMPART || !structure.my)) {
                // Can't walk through non-walkable buildings
                costs.set(structure.pos.x, structure.pos.y, 0xff);
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
