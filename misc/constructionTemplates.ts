interface Template {[key: string]: Array<{dx: number, dy: number}>};
type MyMap = Array<Array<{exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number}>>;

const FREE_SPACE = 'free';
const minCoord = 2;
const maxCoord = 47;

const idealClearance = 7;
const minClearance = 4;

const maxTries = 64;
const width = 6;

export function placeBaseSites(room: Room, count: number): number {
    if(!hasSeeds(room)) {
        setSeeds(room);
    }

    let placed = 0;

    if(room.memory.seed) {
        const seed = room.memory.seed;
        let template = rotateTemplate(seedTemplate, seed.r);
        let retVal;
        for(const type of Object.keys(template)) {
            if(type !== FREE_SPACE) {
                for(const delta of template[type]) {
                    retVal = room.createConstructionSite(seed.x + delta.dx, seed.y + delta.dy, type as BuildableStructureConstant);
                    if(retVal === OK) {
                        placed++;
                        if(placed >= count) {
                            return placed;
                        }
                    }
                }
            }
        }

        if(room.memory.petals) {
            for(const petal of room.memory.petals) {
                template = rotateTemplate(petalTemplate, petal.r);
                for(const type of Object.keys(template)) {
                    if(type !== FREE_SPACE) {
                        for(const delta of template[type]) {
                            retVal = room.createConstructionSite(seed.x + petal.dx + delta.dx, seed.y + petal.dy + delta.dy, type as BuildableStructureConstant);
                            if(retVal === OK) {
                                placed++;
                                if(placed >= count) {
                                    return placed;
                                }
                            }
                        }
                    }
                }
            }
        }

        if(room.memory.lab) {
            const lab = room.memory.lab;
            template = rotateTemplate(labTemplate, room.memory.lab.r);
            for(const type of Object.keys(template)) {
                if(type !== FREE_SPACE) {
                    for(const delta of template[type]) {
                        retVal = room.createConstructionSite(seed.x + lab.dx + delta.dx, seed.y + lab.dy + delta.dy, type as BuildableStructureConstant);
                        if(retVal === OK) {
                            placed++;
                            if(placed >= count) {
                                return placed;
                            }
                        }
                    }
                }
            }
        }
    }

    return placed;
}

export function displayLayout(room: Room) {
    if(!hasSeeds(room)) {
        setSeeds(room);
    }

    if(room.memory.seed) {
        let template = rotateTemplate(seedTemplate, room.memory.seed.r);
        for(const type of Object.keys(template)) {
            if(type !== FREE_SPACE) {
                for(const delta of template[type]) {
                    room.visual.circle(room.memory.seed.x + delta.dx, room.memory.seed.y + delta.dy);
                }
            }
        }

        if(room.memory.lab) {
            template = rotateTemplate(labTemplate, room.memory.lab.r);
            for(const type of Object.keys(template)) {
                if(type !== FREE_SPACE) {
                    for(const delta of template[type]) {
                        room.visual.circle(room.memory.seed.x + room.memory.lab.dx + delta.dx, room.memory.seed.y + room.memory.lab.dy + delta.dy, {fill: '#8846f2'});
                    }
                }
            }
        }

        if(room.memory.petals) {
            for(const petal of room.memory.petals) {
                template = rotateTemplate(petalTemplate, petal.r);
                for(const type of Object.keys(template)) {
                    if(type !== FREE_SPACE) {
                        for(const delta of template[type]) {
                            room.visual.circle(room.memory.seed.x + petal.dx + delta.dx, room.memory.seed.y + petal.dy + delta.dy, {fill: '#cde26f'});
                        }
                    }
                }
            }
        }
    }
    
}

function hasSeeds(room: Room): boolean {
    if(room.memory.seed && room.memory.lab && room.memory.petals && room.memory.petals.length === 3) {
        return true;
    }
    else {
        return false;
    }
}

function setSeeds(room: Room): boolean {
    const myMap = getDistanceGraph(room);
    if(!myMap) {
        return false;
    }

    const maxClearance: number = _.max(_.map(myMap, (row) => _.max(_.map(row, 'wallDist'))));

    if(maxClearance >= idealClearance) {
        // set up a nice base
        const seed = calculateOptimalPosition(myMap, idealClearance, 0.5, -1, 1);
        if(!seed) {
            return false;
        }

        room.memory.seed = {x: seed.x, y: seed.y, r: 0};
        room.memory.lab = {dx: 0, dy: 0, r: 0};
        room.memory.petals = [{dx: 0, dy: 0, r: 1}, {dx: 0, dy: 0, r: 2}, {dx: 0, dy: 0, r: 3}];
        return true;
    }
    else if(maxClearance >= minClearance) {
        // try to set up an okay base
        const seed = calculateOptimalPosition(myMap, maxClearance, 0.5, -1, 1);
        if(!seed) {
            return false;
        }

        let bestDirection = -1;
        let bestDistance = -Infinity;
        for(let i = 0; i < 4; i++) {
            const spot = {x: seed.x, y: seed.y};
            let distance = 0;
            while(myMap[spot.x] && myMap[spot.x][spot.y] && myMap[spot.x][spot.y].wallDist >= minClearance) {
                distance++;
                step(spot, i);
            }

            if(distance > bestDistance) {
                bestDistance = distance;
                bestDirection = i;
            }
        }

        if(bestDirection === -1) {
            return false;
        }

        const labDirection = (bestDirection + 2) % 4;
        step(seed, bestDirection, 2); // TODO(Daniel): remove magic number
        const trueSeed = {x: seed.x, y: seed.y, r: labDirection};
        const lab = {dx: 0, dy: 0, r: labDirection};
        const petals: Array<{dx: number, dy: number, r: number}> = [];

        placePetals(new RoomPosition(seed.x, seed.y, room.name), labDirection, petals);

        if(petals.length < 3) {
            return false;
        }

        room.memory.seed = trueSeed;
        room.memory.lab = lab;
        room.memory.petals = petals;

        return true;
    }
    else {
        // cry, hcf
        return false;
    }
}

const seedTemplate: Template = {
    [STRUCTURE_LINK]: [{dx: 0, dy: 1}],
    [STRUCTURE_SPAWN]: [{dx: -1, dy: 0}],
    [STRUCTURE_STORAGE]: [{dx: 1, dy: 0}],
    [STRUCTURE_TERMINAL]: [{dx: 0, dy: -1}],
    [FREE_SPACE]: [{dx: 0, dy: 0}]
};

const petalTemplate: Template = {
    [STRUCTURE_EXTENSION]: [
        {dx: 1, dy: -3}, {dx: 2, dy: -3}, {dx: 3, dy: -2}, {dx: 3, dy: -1}, {dx: 2, dy: -4},
        {dx: 3, dy: -4}, {dx: 4, dy: -3}, {dx: 4, dy: -3}, {dx: 1, dy: -5}, {dx: 3, dy: -5},
        {dx: 4, dy: -5}, {dx: 5, dy: -4}, {dx: 5, dy: -3}, {dx: 5, dy: -1}, {dx: 1, dy: -6},
        {dx: 2, dy: -6}, {dx: 4, dy: -6}, {dx: 6, dy: -4}, {dx: 6, dy: -2}, {dx: 6, dy: -1}
    ],
    [STRUCTURE_POWER_SPAWN]: [{dx: 2, dy: -1}],
    [STRUCTURE_SPAWN]: [{dx: 2, dy: -1}],
    [STRUCTURE_TOWER]: [{dx: 1, dy: -2}],
    [FREE_SPACE]: [
        {dx: 1, dy: -1}, {dx: 2, dy: -2}, {dx: 3, dy: -3}, {dx: 4, dy: -4}, {dx: 5, dy: -5},
        {dx: 6, dy: -6}, {dx: 1, dy: -4}, {dx: 2, dy: -5}, {dx: 4, dy: -1}, {dx: 5, dy: -2}
    ]
};

const labTemplate: Template = {
    [STRUCTURE_LAB]: [
        {dx: 2, dy: -3}, {dx: 2, dy: -4}, {dx: 3, dy: -4}, {dx: 3, dy: -2}, {dx: 4, dy: -2},
        {dx: 4, dy: -3}, {dx: 3, dy: -5}, {dx: 4, dy: -5}, {dx: 5, dy: -3}, {dx: 5, dy: -4}
    ],
    [STRUCTURE_NUKER]: [{dx: 5, dy: -1}],
    [STRUCTURE_OBSERVER]: [{dx: 3, dy: -1}],
    [STRUCTURE_TOWER]: [{dx: 1, dy: -2}, {dx: 2, dy: -1}, {dx: 1, dy: -3}],
    [FREE_SPACE]: [
        {dx: 1, dy: -1}, {dx: 2, dy: -2}, {dx: 3, dy: -3}, {dx: 4, dy: -4}, {dx: 5, dy: -5},
        {dx: 6, dy: -6}
    ]
};

function placePetals(seed: RoomPosition, startDirection: number, petals: Array<{dx: number, dy: number, r: number}>): void {
    const templates = [
        rotateTemplate(petalTemplate, 0), rotateTemplate(petalTemplate, 1),
        rotateTemplate(petalTemplate, 2), rotateTemplate(petalTemplate, 3)
    ];
    
    let dx = 0;
    let dy = 0;
    let rotation = (startDirection + 1) % 4;
    let radius = 0;
    let tries = 1;

    while(petals.length < 3 && tries < maxTries) {
        if(seed.x + (dx * width) >= 0 && seed.x + (dx * width) < 50 && seed.y + (dy * width) >= 0 && seed.y + (dy * width) < 50) {
            // check if a petal can fit there
            const petalPos = new RoomPosition(seed.x + (dx * width), seed.y + (dy * width), seed.roomName);
            if(doesItFit(templates[rotation], petalPos)) {
                petals.push({'dx': dx * width, 'dy': dy * width, r: rotation});
            }
        }

        // advance the position
        if(rotation === (startDirection + 3) % 4 && rotation % 2 === 0 && dy === 0) {
            radius++;
            dx = radius;
            if(rotation === 2) { dx *= -1; }
        }
        else if(rotation === (startDirection + 3) % 4 && rotation % 2 === 1 && dx === 0) {
            radius++;
            dy = radius;
            if(rotation === 3) { dy *= -1; }
        }

        if((rotation % 2 === 0 && dy === 0) || (rotation % 2 === 1 && dx === 0)) {
            rotation = (rotation + 1) % 4;
        }
        else if(dy === -radius && dx < radius) {
            dx++;
        }
        else if(dx === radius && dy < radius) {
            dy++;
        }
        else if(dy === radius && dx > -radius) {
            dx--;
        }
        else if(dx === -radius && dy > -radius) {
            dy--;
        }

        tries++;
    }
}

function step(spot: {x: number, y: number}, r: number, dist: number = 1): void {
    for(let i = 0; i < dist; i++) {
        switch(r % 4) {
            case 0: {
                spot.x++;
                spot.y--;
                break;
            }
            case 1: {
                spot.x++;
                spot.y++;
                break;
            }
            case 2: {
                spot.x--;
                spot.y++;
                break;
            }
            case 3: {
                spot.x--;
                spot.y--;
                break;
            }
        }
    }
}

function doesItFit(template: Template, seedPos: RoomPosition): boolean {
    const terrain: RoomTerrain = Game.map.getRoomTerrain(seedPos.roomName);
    for(const type of Object.keys(template)) {
        for(const offset of template[type]) {
            if(seedPos.x + offset.dx < minCoord || seedPos.x + offset.dx > maxCoord) {
                return false;
            }
            else if(seedPos.y + offset.dy < minCoord || seedPos.y + offset.dy > maxCoord) {
                return false;
            }
            else if(terrain.get(seedPos.x + offset.dx, seedPos.y + offset.dy) === TERRAIN_MASK_WALL) {
                return false;
            }
        }
    }
    return true;
}

function rotateTemplate(template: Template, rotation: number): Template {
    const rotated: Template = {};
    for(const type of Object.keys(template)) {
        rotated[type] = [];
        for(const pos of template[type]) {
            switch(rotation % 4) {
                case 0: {
                    rotated[type].push({dx: pos.dx, dy: pos.dy});
                    break;
                }
                case 1: {
                    rotated[type].push({dx: -pos.dy, dy: pos.dx});
                    break;
                }
                case 2: {
                    rotated[type].push({dx: -pos.dx, dy: -pos.dy});
                    break;
                }
                case 3: {
                    rotated[type].push({dx: pos.dy, dy: -pos.dx});
                    break;
                }
            }
        }
    }
    return rotated;
}

function calculateOptimalPosition (myMap: MyMap, minWallDist: number, controllerWeight: number, exitWeight: number, sourceWeight: number): {x: number, y: number} | null {
    // For placing the center of a bunker one might use: calculateOptimalPosition(roomMap, 5, 0.5, -1, 1);
    let minPos: {x: number, y: number} | null = null;
    let minScore = 0;

    for(let x = 0; x < 50; x++) {
        for(let y = 0; y < 50; y++) {
            if(myMap[x][y].wallDist >= minWallDist) {
                const score = (controllerWeight * (myMap[x][y].controllerDist * myMap[x][y].controllerDist)) + (exitWeight * myMap[x][y].exitDist) + (sourceWeight * _.sum(_.map(myMap[x][y].sourceDist, (dist) => (1 / myMap[x][y].sourceDist.length) * (dist * dist))));
                if(!minPos) {
                    minScore = score;
                    minPos = {'x': x, 'y': y}
                }
                else if(score < minScore || minPos.x < 0) {
                    minScore = score;
                    minPos.x = x;
                    minPos.y = y;
                }
            }
        }
    }
    
    return minPos;
}

function getDistanceGraph(room: Room): MyMap | null {
    // Calculates the minimum path distance from a number of places of interest, to every spot in the room
    // Warning, can take between 5 and 30 cpu, usually around 12. Run rarely.

    if(global.myMaps && global.myMaps[room.name]) {
        return global.myMaps[room.name];
    }

    const terrain: RoomTerrain = room.getTerrain();
    const sources = _.map(room.find(FIND_SOURCES), (source) => source.pos);
    if(!room.controller) {
        return null;
    }
    const controller: RoomPosition = room.controller.pos;
    const myMap: MyMap = [];

    const exitQueue = [];
    const wallQueue = [];
    const queue = [];

    for(let x = 0; x < 50; x++) {
        myMap.push([]);
        for(let y = 0; y < 50; y++) {
            const tempTerrain: {exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number} = {exitDist: -1, wallDist: -1, sourceDist: [], controllerDist: -1};
            
            if((x === 0 || y === 0 || x === 49 || y === 49) && terrain.get(x, y) === 0) {
                tempTerrain.exitDist = 0;
                exitQueue.unshift({'x': x, 'y': y});

                tempTerrain.wallDist = 0;
                wallQueue.unshift({'x': x, 'y': y});
            }

            if(terrain.get(x, y) === TERRAIN_MASK_WALL) {
                tempTerrain.wallDist = 0;
                wallQueue.unshift({'x': x, 'y': y});
            }
            
            tempTerrain.sourceDist = [];
            for(const i in sources){
                if(x === sources[i].x && y === sources[i].y){
                    tempTerrain.sourceDist.push(0);
                }
                else {
                    tempTerrain.sourceDist.push(-1);
                }
            }
            
            if(x === controller.x && y === controller.y) {
                tempTerrain.controllerDist = 0;
            }
            
            myMap[x].push(tempTerrain);
        }
    }
    
    while(exitQueue.length > 0) {
        const pos: {x: number, y: number} | undefined = exitQueue.pop();
        if(!pos) { continue; }
        const current = myMap[pos.x][pos.y].exitDist;

        for(let dx = -1; dx <= 1; dx++) {
            const x: number = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                const y: number = pos.y + dy;
                
                if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist !== 0 && myMap[x][y].exitDist < 0) {
                    myMap[x][y].exitDist = current + 1;
                    exitQueue.unshift({'x': x, 'y': y});
                }
            }
        }
    }
    
    while(wallQueue.length > 0) {
        const pos: {x: number, y: number} | undefined = wallQueue.pop();
        if(!pos) { continue; }
        const current = myMap[pos.x][pos.y].wallDist;

        for(let dx = -1; dx <= 1; dx++) {
            const x: number = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                const y: number = pos.y + dy;
                
                if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist < 0) {
                    myMap[x][y].wallDist = current + 1;
                    wallQueue.unshift({'x': x, 'y': y});
                }
            }
        }
    }

    queue.unshift({x: controller.x, y: controller.y});
    while(queue.length > 0) {
        const pos: {x: number, y: number} | undefined = queue.pop();
        if(!pos) { continue; }
        const current = myMap[pos.x][pos.y].controllerDist;

        for(let dx = -1; dx <= 1; dx++) {
            const x: number = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                const y: number = pos.y + dy;
                
                if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist !== 0 && myMap[x][y].controllerDist < 0) {
                    myMap[x][y].controllerDist = current + 1;
                    queue.unshift({'x': x, 'y': y});
                }
            }
        }
    }
    
    for(const i in sources) {
        queue.unshift({x: sources[i].x, y: sources[i].y});
        while(queue.length > 0) {
            const pos: {x: number, y: number} | undefined = queue.pop();
            if(!pos) { continue; }
            const current = myMap[pos.x][pos.y].sourceDist[i];
    
            for(let dx = -1; dx <= 1; dx++) {
                const x: number = pos.x + dx;
                for(let dy = -1; dy <= 1; dy++) {
                    const y: number = pos.y + dy;
                    
                    if((dx !== 0 || dy !== 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist !== 0 && myMap[x][y].sourceDist[i] < 0) {
                        myMap[x][y].sourceDist[i] = current + 1;
                        queue.unshift({'x': x, 'y': y});
                    }
                }
            }
        }
    }

    if(!global.myMaps) {
        global.myMaps = {};
    }

    global.myMaps[room.name] = myMap;
    return myMap;
}
