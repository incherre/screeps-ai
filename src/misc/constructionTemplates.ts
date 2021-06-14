import type { Colony } from '../colony'
import { getNewSpawnName } from './personalization';

interface Template {[key: string]: {dx: number, dy: number}[]};
interface Layout {[key: string]: {x: number, y: number}[]};
type MyMap = Array<Array<{exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number}>>;

const FREE_SPACE = 'free';
const MIN_BUILDABLE_COORD = 5;
const MIN_COORD = 0;
const MAX_BUILDABLE_COORD = 44;
const MAX_COORD = 49;
const WALL_OFFSET = 2;
const CONTROLLER_MAX_LEVEL = 8;

const idealClearance = 6;
const minClearance = 3;

const importantStructures = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_TOWER, STRUCTURE_CONTAINER, STRUCTURE_LINK];

const coreTemplate: Template = {
    [STRUCTURE_LINK]: [{dx: 0, dy: 1}],
    [STRUCTURE_STORAGE]: [{dx: -1, dy: 0}],
    [STRUCTURE_SPAWN]: [{dx: 0, dy: -1}],
    [STRUCTURE_TERMINAL]: [{dx: 1, dy: 0}],
    [FREE_SPACE]: [{dx: 0, dy: 0}]
};
const initalToVisit: {dx: number, dy: number}[] = [
    {dx: 1, dy: 1}, {dx: 1, dy: -1}, {dx: -1, dy: -1}, {dx: -1, dy: 1}
];
const spawnSpots: number[] = [40, 57];
const cornerClearanceThreshold: number = 38;

const labTemplate: Template = {
    [STRUCTURE_LAB]: [
        {dx: 1, dy: 2}, {dx: 2, dy: 1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: 2, dy: 0},
        {dx: 0, dy: 2}, {dx: 3, dy: 1}, {dx: 1, dy: 3}, {dx: 3, dy: 2}, {dx: 2, dy: 3}
    ],
    [FREE_SPACE]: [
        {dx: 0, dy: 0}, {dx: 1, dy: 1}, {dx: 2, dy: 2}
    ]
};

const auxTemplate: Template = {
    [STRUCTURE_NUKER]: [{dx: 0, dy: 1}],
    [STRUCTURE_OBSERVER]: [{dx: 0, dy: 2}],
    [STRUCTURE_POWER_SPAWN]: [{dx: 1, dy: 1}],
    [STRUCTURE_FACTORY]: [{dx: 1, dy: 2}],
    [FREE_SPACE]: [{dx: 0, dy: 0}, {dx: 1, dy: 0}, {dx: 2, dy: 1}]
}

/**
 * Places construction sites for the capital room of the provided colony.
 * @param {Colony} colony - The colony for which to place construction sites
 * @param {number} maxAllowed - The maximum number of sites to place
 * @returns {number} - The number of sites that were placed
 */
export function placeBaseSites(colony: Colony, maxAllowed: number): number {
    let placed = 0;
    const capitalRoom = colony.capital;
    if(!capitalRoom) {
        console.log('Attempted to build in room', colony.capitalName, 'but could not find the room.');
        return placed;
    }

    const layout = computeLayout(capitalRoom);
    if(!layout) {
        console.log('Attempted to build in room', capitalRoom.name, 'but could not find a layout.');
        return placed;
    }

    for(const type in layout) {
        if(type === FREE_SPACE) {
            continue;
        }

        const controllerLevel = capitalRoom.controller ? capitalRoom.controller.level : 0;
        const existing = colony.structures.get(type as BuildableStructureConstant);
        const numExisting = existing ? existing.length : 0;
        if(numExisting >= CONTROLLER_STRUCTURES[type as BuildableStructureConstant][controllerLevel] || numExisting >= layout[type].length) {
            continue;
        }

        for(const coords of layout[type]) {
            let returnCode: ScreepsReturnCode = ERR_NOT_FOUND;
            if(type === STRUCTURE_SPAWN) {
                returnCode = capitalRoom.createConstructionSite(coords.x, coords.y, STRUCTURE_SPAWN, getNewSpawnName());
            }
            else {
                returnCode = capitalRoom.createConstructionSite(coords.x, coords.y, type as BuildableStructureConstant);
            }

            if(returnCode === OK) {
                placed++;
            }

            if(placed >= maxAllowed) {
                return placed;
            }
        }
    }

    return placed;
}

/**
 * Places construction sites for ramparts and walls in the capital room of the provided colony.
 * @param {Colony} colony - The colony for which to place construction sites
 * @param {number} maxAllowed - The maximum number of sites to place
 * @returns {number} - The number of sites that were placed
 */
export function placeBaseRamparts(colony: Colony, maxAllowed: number): number {
    if(!colony.capital) {
        return 0;
    }

    // Record where ramparts already are.
    const barrierSet = new Set<string>();
    const ramparts = colony.structures.get(STRUCTURE_RAMPART);
    if(ramparts) {
        for(const rampart of ramparts) {
            barrierSet.add([rampart.pos.x, rampart.pos.y].join());
        }
    }

    let placed = 0;

    // Place ramparts on essential structures.
    for(const structureType of importantStructures) {
        const structures = colony.structures.get(structureType);
        if(!structures) {
            continue;
        }

        for(const structure of structures) {
            if(barrierSet.has([structure.pos.x, structure.pos.y].join())) {
                continue;
            }

            if(structure.pos.createConstructionSite(STRUCTURE_RAMPART) === OK) {
                placed += 1;
            }
            else {
                continue;
            }

            if(placed >= maxAllowed) {
                return placed;
            }
        }
    }

    const terrain = colony.capital.getTerrain();

    // Place ramparts around the controller.
    if(colony.capital.controller) {
        const spot = colony.capital.controller.pos;

        for(let dx = -1; dx <= 1; dx++) {
            for(let dy = -1; dy <= 1; dy++) {
                if(dx === 0 && dy === 0) {
                    continue;
                }

                if(barrierSet.has([spot.x + dx, spot.y + dy].join())) {
                    continue;
                }

                if(terrain.get(spot.x + dx, spot.y + dy) === TERRAIN_MASK_WALL) {
                    continue;
                }

                if(colony.capital.createConstructionSite(spot.x + dx, spot.y + dy, STRUCTURE_RAMPART) === OK) {
                    placed += 1;
                }
                else {
                    continue;
                }

                if(placed >= maxAllowed) {
                    return placed;
                }
            }
        }
    }

    // Record where walls already are.
    const walls = colony.structures.get(STRUCTURE_WALL);
    if(walls) {
        for(const wall of walls) {
            barrierSet.add([wall.pos.x, wall.pos.y].join());
        }
    }

    // Place exit walls.
    const exits = Game.map.describeExits(colony.capitalName);
    if(exits) {
        for(const direction in exits) {
            if(direction === TOP.toString()) {
                const y = MIN_COORD + WALL_OFFSET;
                for(let x = MIN_COORD + WALL_OFFSET; x <= MAX_COORD - WALL_OFFSET; x++) {
                    if(barrierSet.has([x, y].join())) {
                        continue;
                    }

                    if(terrain.get(x, y) === TERRAIN_MASK_WALL) {
                        continue;
                    }

                    const type = (x + y) % 2 === 0 ? STRUCTURE_WALL : STRUCTURE_RAMPART;
                    if(colony.capital.createConstructionSite(x, y, type) === OK) {
                        placed += 1;
                    }
                    else {
                        continue;
                    }

                    if(placed >= maxAllowed) {
                        return placed;
                    }
                }
            }
            else if(direction === RIGHT.toString()) {
                const x = MAX_COORD - WALL_OFFSET;
                for(let y = MIN_COORD + WALL_OFFSET; y <= MAX_COORD - WALL_OFFSET; y++) {
                    if(barrierSet.has([x, y].join())) {
                        continue;
                    }

                    if(terrain.get(x, y) === TERRAIN_MASK_WALL) {
                        continue;
                    }

                    const type = (x + y) % 2 === 0 ? STRUCTURE_WALL : STRUCTURE_RAMPART;
                    if(colony.capital.createConstructionSite(x, y, type) === OK) {
                        placed += 1;
                    }
                    else {
                        continue;
                    }

                    if(placed >= maxAllowed) {
                        return placed;
                    }
                }
            }
            else if(direction === BOTTOM.toString()) {
                const y = MAX_COORD - WALL_OFFSET;
                for(let x = MIN_COORD + WALL_OFFSET; x <= MAX_COORD - WALL_OFFSET; x++) {
                    if(barrierSet.has([x, y].join())) {
                        continue;
                    }

                    if(terrain.get(x, y) === TERRAIN_MASK_WALL) {
                        continue;
                    }

                    const type = (x + y) % 2 === 0 ? STRUCTURE_WALL : STRUCTURE_RAMPART;
                    if(colony.capital.createConstructionSite(x, y, type) === OK) {
                        placed += 1;
                    }
                    else {
                        continue;
                    }

                    if(placed >= maxAllowed) {
                        return placed;
                    }
                }
            }
            else if(direction === LEFT.toString()) {
                const x = MIN_COORD + WALL_OFFSET;
                for(let y = MIN_COORD + WALL_OFFSET; y <= MAX_COORD - WALL_OFFSET; y++) {
                    if(barrierSet.has([x, y].join())) {
                        continue;
                    }

                    if(terrain.get(x, y) === TERRAIN_MASK_WALL) {
                        continue;
                    }

                    const type = (x + y) % 2 === 0 ? STRUCTURE_WALL : STRUCTURE_RAMPART;
                    if(colony.capital.createConstructionSite(x, y, type) === OK) {
                        placed += 1;
                    }
                    else {
                        continue;
                    }

                    if(placed >= maxAllowed) {
                        return placed;
                    }
                }
            }
        }
    }

    return placed;
}

/**
 * Displays the layout for a given room.
 * @param {Room} room - The room in which to display the layout
 */
export function displayLayout(room: Room): void {
    const layout = computeLayout(room);
    if(!layout) {
        console.log('Attempted to display layout in room', room.name, 'but could not find a layout.');
        return;
    }

    for(const type in layout) {
        let color = '#8846f2';
        if(type === STRUCTURE_LAB) {
            color = '#ffffff';
        }
        else if(type === STRUCTURE_SPAWN) {
            color = '#96f246';
        }
        else if(type === STRUCTURE_EXTENSION) {
            color = '#f2e446';
        }

        for(const index in layout[type]) {
            const coords = layout[type][index];
            room.visual.circle(coords.x, coords.y, {fill: color});
            room.visual.text(index, coords.x, coords.y, {color: '#000000'});
        }
    }
}

/**
 * Computes or used cached construction layout for a room.
 * @param {Room} room - The room in which to compute the layout
 * @returns {Layout | null} - The layout, if a valid layout was found
 */
export function computeLayout(room: Room): Layout | null {
    if(room.memory.layout) {
        return room.memory.layout;
    }

    let core: {x: number, y: number} | undefined | null = room.memory.core;
    if(!core) {
        const roomMap = getDistanceGraph(room);
        if(!roomMap) {
            console.log('Tried to calulate the core for room', room.name, 'but generating the map failed.');
            return null;
        }

        core = calculateOptimalPosition(roomMap, idealClearance, /*controllerWeight=*/0.5, /*exitWeight=*/-20, /*sourceWeight=*/1);

        if(!core) {
            core = calculateOptimalPosition(roomMap, minClearance, /*controllerWeight=*/0.5, /*exitWeight=*/-20, /*sourceWeight=*/1);
        }
    }

    if(!core) {
        console.log('Tried to calulate the core for room', room.name, 'but no suitable positions were found.');
        return null;
    }

    room.memory.core = core;

    const visitedNodes = new Set<string>();
    const layout: Layout = {};
    for(const type in coreTemplate) {
        if(type === FREE_SPACE) {
            for(const deltas of coreTemplate[type]) {
                visitedNodes.add([deltas.dx, deltas.dy].join());
            }
            continue;
        }

        if(!layout[type]) {
            layout[type] = [];
        }

        for(const deltas of coreTemplate[type]) {
            layout[type].push({x: core.x + deltas.dx, y: core.y + deltas.dy});
            visitedNodes.add([deltas.dx, deltas.dy].join());
        }
    }

    const sourceLocations: {x: number, y: number}[] = _.map(room.find(FIND_SOURCES), (source) => { return {x: source.pos.x, y: source.pos.y}; });
    const terrain: RoomTerrain = Game.map.getRoomTerrain(room.name);
    const toVisit = _.cloneDeep(initalToVisit);
    let placedSpawningVessels = 0;
    const neededSpawningVessels = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][CONTROLLER_MAX_LEVEL] +
                                  CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][CONTROLLER_MAX_LEVEL] - 1; // One spawn is in the core template.
    let labsBox: {minx: number, miny: number, maxx: number, maxy: number} | null = null;
    let placedAux: boolean = false;
    while(toVisit.length > 0 && (!placedAux || placedSpawningVessels < neededSpawningVessels)) {
        const deltas: {dx: number, dy: number} | undefined = toVisit.pop();
        if(!deltas) {
            continue;
        }
        const pos = {x: core.x + deltas.dx, y: core.y + deltas.dy};
        const absdx = Math.abs(deltas.dx);
        const absdy = Math.abs(deltas.dy);

        const nearSource = _.some(sourceLocations, (sourcePos) => pos.x >= (sourcePos.x - 1) && pos.x <= (sourcePos.x + 1) && pos.y >= (sourcePos.y - 1) && pos.y <= (sourcePos.y + 1))
        const inAlreadyPlacedLab = labsBox ? pos.x >= labsBox.minx && pos.x <= labsBox.maxx && pos.y >= labsBox.miny && pos.y <= labsBox.maxy : false;
        const isWall = terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL;
        let hasAdjacentWall = false;
        for(const wallDeltas of [{dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1}]) {
            if(terrain.get(pos.x + wallDeltas.dx, pos.y + wallDeltas.dy) === TERRAIN_MASK_WALL) {
                hasAdjacentWall = true;
                break;
            }
        }
        const couldBeLabSeed = Math.max(absdx, absdx) > 1 && absdx !== 0 && absdy !== 0 && (absdx + (2 * absdy)) % 3 === 0;
        const couldBeVessel = (absdx === 0 && absdy % 3 === 1) || (absdy === 0 && absdx % 3 === 1) || (((absdx > 0 && absdy > 0) || placedSpawningVessels > cornerClearanceThreshold) && (absdx + (2 * absdy)) % 3 > 0);
        let templateRotation = 0; // +x, +y
        if(deltas.dx < 0 && deltas.dy > 0) {
            templateRotation = 1; // -x, +y
        }
        else if(deltas.dx < 0 && deltas.dy < 0) {
            templateRotation = 2; // -x, -y
        }
        else if(deltas.dx > 0 && deltas.dy < 0) {
            templateRotation = 3; // +x, -y
        }

        if (!isWall && !inAlreadyPlacedLab && (!hasAdjacentWall || placedSpawningVessels > cornerClearanceThreshold) && !nearSource && couldBeVessel) {
            const vesselType = spawnSpots.includes(placedSpawningVessels) ? STRUCTURE_SPAWN : STRUCTURE_EXTENSION;
            if(!layout[vesselType]) {
                layout[vesselType] = [];
            }

            layout[vesselType].push(pos);
            placedSpawningVessels += 1;
        }
        else if(!labsBox && !inAlreadyPlacedLab && couldBeLabSeed && doesItFit(rotateTemplate(labTemplate, templateRotation), pos, terrain)) {
            const rotatedLabTemplate = rotateTemplate(labTemplate, templateRotation);
            labsBox = {minx: pos.x, miny: pos.y, maxx: pos.x, maxy: pos.y};
            for(const type in rotatedLabTemplate) {
                if(type === FREE_SPACE) {
                    continue;
                }

                if(!layout[type]) {
                    layout[type] = [];
                }

                for(const templateDeltas of rotatedLabTemplate[type]) {
                    const labx = pos.x + templateDeltas.dx;
                    const laby = pos.y + templateDeltas.dy;
                    layout[type].push({x: labx, y: laby});

                    if(labx < labsBox.minx) {
                        labsBox.minx = labx;
                    }
                    if(labx > labsBox.maxx) {
                        labsBox.maxx = labx;
                    }
                    if(laby < labsBox.miny) {
                        labsBox.miny = laby;
                    }
                    if(laby > labsBox.maxy) {
                        labsBox.maxy = laby;
                    }
                }
            }
        }
        else if(placedSpawningVessels >= neededSpawningVessels && labsBox && !placedAux && !inAlreadyPlacedLab && couldBeLabSeed && doesItFit(rotateTemplate(auxTemplate, templateRotation), pos, terrain)) {
            const rotatedAuxTemplate = rotateTemplate(auxTemplate, templateRotation);
            for(const type in rotatedAuxTemplate) {
                if(type === FREE_SPACE) {
                    continue;
                }

                if(!layout[type]) {
                    layout[type] = [];
                }

                for(const templateDeltas of rotatedAuxTemplate[type]) {
                    const labx = pos.x + templateDeltas.dx;
                    const laby = pos.y + templateDeltas.dy;
                    layout[type].push({x: labx, y: laby});
                }
            }
            placedAux = true;
        }

        for(let ddx = -1; ddx <= 1; ddx++) {
            const x: number = pos.x + ddx;
            const newdx: number = deltas.dx + ddx;
            if(x < MIN_BUILDABLE_COORD || x > MAX_BUILDABLE_COORD) {
                continue
            }

            for(let ddy = -1; ddy <= 1; ddy++) {
                const y: number = pos.y + ddy;
                const newdy: number = deltas.dy + ddy;

                if((ddx !== 0 || ddy !== 0) && y >= MIN_BUILDABLE_COORD && y < MAX_BUILDABLE_COORD &&
                   !visitedNodes.has([newdx, newdy].join()) && terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    toVisit.unshift({'dx': newdx, 'dy': newdy});
                    visitedNodes.add([newdx, newdy].join());
                }
            }
        }
    }

    if (placedSpawningVessels < neededSpawningVessels || !labsBox || !placedAux) {
        console.log('Tried to calulate the layout for room', room.name, 'but not all structures were placed.');
        return null;
    }

    room.memory.layout = layout;
    return layout;
}

/**
 * Compute whether a template fits in the terrain at a specific location.
 * @param {Template} template - The template which may not fit
 * @param {{x: number, y: number}} seedPos - The position corresponding to the template's (0, 0)
 * @param {RoomTerrain} terrain - The terrain to check against
 * @returns {boolean} - Whether the template fits or not
 */
function doesItFit(template: Template, seedPos: {x: number, y: number}, terrain: RoomTerrain): boolean {
    for(const type of Object.keys(template)) {
        if(type !== FREE_SPACE) {
            for(const offset of template[type]) {
                if(seedPos.x + offset.dx < MIN_BUILDABLE_COORD || seedPos.x + offset.dx > MAX_BUILDABLE_COORD) {
                    return false;
                }
                else if(seedPos.y + offset.dy < MIN_BUILDABLE_COORD || seedPos.y + offset.dy > MAX_BUILDABLE_COORD) {
                    return false;
                }
                else if(terrain.get(seedPos.x + offset.dx, seedPos.y + offset.dy) === TERRAIN_MASK_WALL) {
                    return false;
                }
            }
        }
    }
    return true;
}

/**
 * Computes a new template that is a rotated version of the provided template.
 * @param {Template} template - The template to be rotated
 * @param {number} rotation - The direction to rotate it in
 * @returns {Template} - The rotated template
 */
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

/**
 * Iterate through the provided map and compute a score on each position, finding the minimum.
 * For placing the center of a bunker one might use: calculateOptimalPosition(roomMap, 5, 0.5, -1, 1);
 * @param {MyMap} myMap - The map of information to use when computing the best position
 * @param {number} minWallDist - The minimum clearance required
 * @param {number} controllerWeight - How much to weight the controller distance
 * @param {number} exitWeight - How much to weight the exit distance
 * @param {number} sourceWeight - How much to weight the source distance
 * @returns {{x: number, y: number} | null} - The best position, if found
 */
function calculateOptimalPosition (myMap: MyMap, minWallDist: number, controllerWeight: number, exitWeight: number, sourceWeight: number): {x: number, y: number} | null {
    let minPos: {x: number, y: number} | null = null;
    let minScore = 0;

    for(let x = 0; x < 50; x++) {
        for(let y = 0; y < 50; y++) {
            if(myMap[x][y].wallDist >= minWallDist) {
                const score = (controllerWeight * (myMap[x][y].controllerDist * myMap[x][y].controllerDist)) +
                              (exitWeight * myMap[x][y].exitDist) +
                              (sourceWeight * _.sum(myMap[x][y].sourceDist, (dist) => (1 / myMap[x][y].sourceDist.length) * (dist * dist)));
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

/**
 * Calculates the minimum path distance from a number of places of interest, to every spot in the room.
 * Warning: can take between 5 and 30 cpu when results are not cached, usually around 12. Run rarely.
 * @param {Room} room - The room object to calculate the map for.
 * @returns {MyMap | null} - The map, if sucessfully calculated.
 */
function getDistanceGraph(room: Room): MyMap | null {
    if(global.myMaps && global.myMaps[room.name]) {
        return global.myMaps[room.name];
    }

    if(!room.controller) {
        return null;
    }
    const controller: RoomPosition = room.controller.pos;
    const terrain: RoomTerrain = room.getTerrain();
    const sources = _.map(room.find(FIND_SOURCES), (source) => source.pos);
    const myMap: MyMap = [];

    const exitQueue = [];
    const wallQueue = [];
    const queue = [];

    for(let x = 0; x < 50; x++) {
        myMap.push([]);
        for(let y = 0; y < 50; y++) {
            const tempTerrain: {exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number} = {exitDist: -1, wallDist: -1, sourceDist: [], controllerDist: -1};

            if((x < MIN_BUILDABLE_COORD || y < MIN_BUILDABLE_COORD || x > MAX_BUILDABLE_COORD || y > MAX_BUILDABLE_COORD) && terrain.get(x, y) === 0) {
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
            for(const source of sources){
                if(x === source.x && y === source.y){
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
