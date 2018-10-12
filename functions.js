const bunkerTemplate = {
    STRUCTURE_SPAWN: [{dx: -2, dy: 0}, {dx: 0, dy: -2}, {dx: 2, dy: 0}],
    STRUCTURE_EXTENSION: [
        {dx: -3, dy: 2}, {dx: -3, dy: 1}, {dx: -3, dy: -1}, {dx: -3, dy: -2}, {dx: -2, dy: -3}, {dx: -1, dy: -3},
        {dx: 1, dy: -3}, {dx: 2, dy: -3}, {dx: 3, dy: -2}, {dx: 3, dy: -1}, {dx: 3, dy: 1}, {dx: 3, dy: 2},
        {dx: 2, dy: 3}, {dx: 1, dy: 3}, {dx: -1, dy: 3}, {dx: -2, dy: 3}, {dx: -4, dy: 3}, {dx: -4, dy: 1},
        {dx: -4, dy: -1}, {dx: -4, dy: -3}, {dx: -3, dy: -4}, {dx: -1, dy: -4}, {dx: 1, dy: -4}, {dx: 3, dy: -4},
        {dx: 4, dy: -3}, {dx: 4, dy: -1}, {dx: 4, dy: 1}, {dx: 4, dy: 3}, {dx: 3, dy: 4}, {dx: 1, dy: 4},
        {dx: -1, dy: 4}, {dx: -3, dy: 4}, {dx: -5, dy: 4}, {dx: -5, dy: 3}, {dx: -5, dy: 2}, {dx: -5, dy: 0},
        {dx: -5, dy: -2}, {dx: -5, dy: -3}, {dx: -5, dy: -4}, {dx: -4, dy: -5}, {dx: -3, dy: -5}, {dx: -2, dy: -5},
        {dx: 0, dy: -5}, {dx: 2, dy: -5}, {dx: 3, dy: -5}, {dx: 4, dy: -5}, {dx: 5, dy: -4}, {dx: 5, dy: -3},
        {dx: 5, dy: -2}, {dx: 5, dy: 0}, {dx: 5, dy: 2}, {dx: 5, dy: 3}, {dx: 5, dy: 4}, {dx: 4, dy: 5},
        {dx: 3, dy: 5}, {dx: 2, dy: 5}, {dx: 0, dy: 5}, {dx: -2, dy: 5}, {dx: -3, dy: 5}, {dx: -4, dy: 5}
    ],
    STRUCTURE_TOWER: [{dx: -2, dy: 1}, {dx: -2, dy: -1}, {dx: -1, dy: -1}, {dx: 1, dy: -2}, {dx: 2, dy: -1}, {dx: -2, dy: 1}],
    STRUCTURE_CONTAINER: [{dx: 0, dy: 0}],
    STRUCTURE_LINK: [{dx: -1, dy: 2}],
    STRUCTURE_TERMINAL: [{dx: 1, dy: 2}],
    STRUCTURE_POWER_SPAWN: [{dx: 0, dy: 2}],
    STRUCTURE_ROAD: [
        {dx: -1, dy: 0}, {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1}, {dx: 1, dy: 0}, {dx: 1, dy: 1},
        {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: -2, dy: 2}, {dx: -2, dy: -2}, {dx: 2, dy: -2}, {dx: 2, dy: 2},
        {dx: 0, dy: 3}, {dx: -3, dy: 3}, {dx: -3, dy: 0}, {dx: -3, dy: -3}, {dx: 0, dy: -3}, {dx: 3, dy: -3},
        {dx: 3, dy: 0}, {dx: 3, dy: 3}, {dx: 2, dy: 4}, {dx: 0, dy: 4}, {dx: -2, dy: 4}, {dx: -4, dy: 4},
        {dx: -4, dy: 2}, {dx: -4, dy: 0}, {dx: -4, dy: -2}, {dx: -4, dy: -4}, {dx: -2, dy: -4}, {dx: 0, dy: -4},
        {dx: 2, dy: -4}, {dx: 4, dy: -4}, {dx: 4, dy: -2}, {dx: 4, dy: 0}, {dx: 4, dy: 2}, {dx: 4, dy: 4},
        {dx: 5, dy: 5}, {dx: 1, dy: 5}, {dx: -1, dy: 5}, {dx: -5, dy: 5}, {dx: -5, dy: 1}, {dx: -5, dy: -1},
        {dx: -5, dy: -5}, {dx: -1, dy: -5}, {dx: 1, dy: -5}, {dx: 5, dy: -5}, {dx: 5, dy: -1}, {dx: 5, dy: 1}
    ],
    STRUCTURE_RAMPART: [
        {dx: 0, dy: 0}, {dx: -1, dy: 0}, {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1}, {dx: 1, dy: 0},
        {dx: 1, dy: 1}, {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: -2, dy: 2}, {dx: -2, dy: 1}, {dx: -2, dy: 0},
        {dx: -2, dy: -1}, {dx: -2, dy: -2}, {dx: -1, dy: -2}, {dx: 0, dy: -2}, {dx: 1, dy: -2}, {dx: 2, dy: -2},
        {dx: 2, dy: -1}, {dx: 2, dy: 0}, {dx: 2, dy: 1}, {dx: 2, dy: 2}, {dx: 1, dy: 2}, {dx: 0, dy: 2},
        {dx: -1, dy: 2}, {dx: -1, dy: 3}, {dx: -2, dy: 3}, {dx: -3, dy: 2}, {dx: -3, dy: 1}, {dx: -3, dy: -1},
        {dx: -3, dy: -2}, {dx: -2, dy: -3}, {dx: -1, dy: -3}, {dx: 1, dy: -3}, {dx: 2, dy: -3}, {dx: 3, dy: -2},
        {dx: 3, dy: -1}, {dx: 3, dy: 1}, {dx: 3, dy: 2}, {dx: 2, dy: 3}, {dx: 1, dy: 3}
    ]
};

var calculateOptimalPosition = function(room, minWallDist, controllerWeight, exitWeight, sourceWeight) {
    // Warning, can take between 5 and 30 cpu, usually around 12. Run rarely.
    // For placing the center of a bunker one might use: calculateOptimalPosition(room, 5, 0.5, -1, 1);

    var terrain = room.getTerrain();
    var sources = _.map(room.find(FIND_SOURCES), (source) => {return source.pos;});
    var controller = room.controller.pos;
    var myMap = [];
    
    var exitQueue = [];
    var wallQueue = [];
    var queue = [];

    for(let x = 0; x < 50; x++) {
        myMap.push([]);
        for(let y = 0; y < 50; y++) {
            let tempTerrain = {};
            
            if((x == 0 || y == 0 || x == 49 || y == 49) && terrain.get(x, y) == 0) {
                tempTerrain.exitDist = 0;
                exitQueue.unshift({x: x, y: y});
            }
            else {
                tempTerrain.exitDist = -1;
            }

            if(terrain.get(x, y) == TERRAIN_MASK_WALL) {
                tempTerrain.wallDist = 0;
                wallQueue.unshift({x: x, y: y});
            }
            else {
                tempTerrain.wallDist = -1;
            }
            
            tempTerrain.sourceDist = [];
            for(let i in sources){
                if(x == sources[i].x && y == sources[i].y){
                    tempTerrain.sourceDist.push(0);
                }
                else {
                    tempTerrain.sourceDist.push(-1);
                }
            }
            
            if(x == controller.x && y == controller.y) {
                tempTerrain.controllerDist = 0;
            }
            else {
                tempTerrain.controllerDist = -1;
            }
            
            myMap[x].push(tempTerrain);
        }
    }
    
    while(exitQueue.length > 0) {
        let pos = exitQueue.pop();
        let current = myMap[pos.x][pos.y].exitDist;

        for(let dx = -1; dx <= 1; dx++) {
            let x = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                let y = pos.y + dy;
                
                if((dx != 0 || dy != 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist != 0 && myMap[x][y].exitDist < 0) {
                    myMap[x][y].exitDist = current + 1;
                    exitQueue.unshift({x: x, y: y});
                }
            }
        }
    }
    
    while(wallQueue.length > 0) {
        let pos = wallQueue.pop();
        let current = myMap[pos.x][pos.y].wallDist;

        for(let dx = -1; dx <= 1; dx++) {
            let x = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                let y = pos.y + dy;
                
                if((dx != 0 || dy != 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist < 0) {
                    myMap[x][y].wallDist = current + 1;
                    wallQueue.unshift({x: x, y: y});
                }
            }
        }
    }

    queue.unshift({x: controller.x, y: controller.y});
    while(queue.length > 0) {
        let pos = queue.pop();
        let current = myMap[pos.x][pos.y].controllerDist;

        for(let dx = -1; dx <= 1; dx++) {
            let x = pos.x + dx;
            for(let dy = -1; dy <= 1; dy++) {
                let y = pos.y + dy;
                
                if((dx != 0 || dy != 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist != 0 && myMap[x][y].controllerDist < 0) {
                    myMap[x][y].controllerDist = current + 1;
                    queue.unshift({x: x, y: y});
                }
            }
        }
    }
    
    for(let i in sources) {
        queue.unshift({x: sources[i].x, y: sources[i].y});
        while(queue.length > 0) {
            let pos = queue.pop();
            let current = myMap[pos.x][pos.y].sourceDist[i];
    
            for(let dx = -1; dx <= 1; dx++) {
                let x = pos.x + dx;
                for(let dy = -1; dy <= 1; dy++) {
                    let y = pos.y + dy;
                    
                    if((dx != 0 || dy != 0) && x >= 0 && x < 50 && y >= 0 && y < 50 && myMap[x][y].wallDist != 0 && myMap[x][y].sourceDist[i] < 0) {
                        myMap[x][y].sourceDist[i] = current + 1;
                        queue.unshift({x: x, y: y});
                    }
                }
            }
        }
    }

    var minPos = {x: -1, y: -1};
    var minScore = 0;

    for(let x = 0; x < 50; x++) {
        for(let y = 0; y < 50; y++) {
            if(myMap[x][y].wallDist >= minWallDist) {
                let score = (controllerWeight * (myMap[x][y].controllerDist * myMap[x][y].controllerDist)) + (exitWeight * myMap[x][y].exitDist) + (sourceWeight * _.sum(_.map(myMap[x][y].sourceDist, (dist) => {return (1 / sources.length) * (dist * dist);})));
                if(score < minScore || minPos.x < 0) {
                    minScore = score;
                    minPos.x = x;
                    minPos.y = y;
                }
            }
        }
    }
    
    return minPos;
}