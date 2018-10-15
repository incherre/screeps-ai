/*
This is the AI for the harvester role.
A harvester should select a source when spawned, and move to that source. If that source has a container next to it, then the harvester should sit on the container.
Once a harvester gets to it's final position, it will just harvest energy and drop it.
*/

// ***** Options *****
var maxHarvesterParts = 8;
var idealBody = [MOVE, WORK, WORK, WORK];
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    var target = Game.getObjectById(creep.memory.source);
    if(creep.ticksToLive % 7 == 0 && _.filter(creep.pos.lookFor(LOOK_STRUCTURES), (structure) => {return structure.structureType == STRUCTURE_CONTAINER}).length == 0) { // every 7th tick, but not all at once as in the case of multiple harvesters using universal time.
        // check for containers and move to them if they exist.
        var container = _findContainer(target);
        if(container != false) {
            creep.moveTo(container, {maxRooms: 1});
            return;
        }
    }

    if(creep.harvest(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {maxRooms: 1});
    }
}

var _make = function(spawn, energy_limit) {
    var temp_energy = energy_limit;
    var body = [];
    for(let i = 0; i < maxHarvesterParts; i++) {
        if(temp_energy >= BODYPART_COST[idealBody[i % idealBody.length]]) {
            body.push(idealBody[i % idealBody.length]);
            temp_energy -= BODYPART_COST[idealBody[i % idealBody.length]];
        }
        else {
            break;
        }
    }

    var sources = _.filter(find.getSources(spawn.room), (source) => _open(source));
    var _target = spawn.pos.findClosestByRange(sources).id;
    
    if(_target == null){_target = find.getSources(spawn.room)[0].id;}

    var mem = {role: 'harvester', home: spawn.room.controller.id, long_range: false, source: _target};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'harvester');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _open = function(source) {
    var harvesters = find.getRole(source.room, 'harvester');
    for(i in harvesters) {
        if(harvesters[i].memory.source == source.id) {
            return false;
        }
    }
    return true;
}

var _findContainer = function(source) {
    var x = source.pos.x;
    var y = source.pos.y;
    var r = 1;
    var y1 = y-r;
    if(y1 < 0){y1 = 0;}
    var x1 = x-r;
    if(x1 < 0){x1 = 0;}
    var y2 = y+r;
    if(y2 > 49){y2 = 49;}
    var x2 = x+r;
    if(x2 > 49){x2 = 49;}

    var list = source.room.lookForAtArea(LOOK_STRUCTURES,y1,x1,y2,x2,true);
    for(let i in list) {
        if(list[i].structure.structureType == STRUCTURE_CONTAINER) {
            return list[i].structure;
        }
    }
    return false;
}

var _shouldMake = function(room) {
    return find.getRole(room, 'harvester').length < find.getSources(room).length;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};