/*
This is the AI for the reserver role.
A reserver should reserve rooms used for remote mining (via the ldh role) to increase yield.
*/

// ***** Options *****
var maxReserverParts = 2; // the maximum number of MOVE, and CLAIM parts a reserver can have
var targets = ["E1S6"];
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(creep.memory.target != creep.room.name) {
        creep.moveTo(new RoomPosition(25, 25, creep.memory.target), {ignoreRoads: true});
    }
    else {
        if(creep.reserveController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {ignoreRoads: true});
        }
    }
}

var _findTargetNum = function(room) {
    var reservers = find.getRole(room, 'reserver');
    var counts = {};
    for(let i in targets) {
        counts[targets[i]] = {count: 0, num: i};
    }
    
    for(let i in reservers) {
        counts[ldhs[i].memory.target].count++;
    }
    
    for(let i in counts) {
        if(counts[i].count <= 0) {
            return counts[i].num;
        }
    }
    
    return -1;
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 650);
    if(numOfPart > maxReserverParts){numOfPart = maxReserverParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
        body.push(CLAIM);
    }

    var targetNum = _findTargetNum(spawn.room);
    var mem = {role: 'reserver', home: spawn.room.controller.id, long_range: true, target: targets[targetNum]};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'reserver');
        
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    return find.getRole(room, 'reserver').length < targets.length;
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};