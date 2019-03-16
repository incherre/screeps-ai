/*
This is the AI for the protector role.
A protector should spawn when requested by an ldh and move to the room specified by the ldh.
Once a protector is in that room, it should fight any enemies that appear in the room.
*/

// ***** Options *****
var maxProtectorParts = 8;
// ***** End *****

var find = require('manager.roomInfo');

var default_whitelist = [];
if(!Memory.WHITELIST) {
    Memory.WHITELIST = default_whitelist;
}

var _run = function(creep) {
    if(creep.memory.canCall < 0 && !creep.spawning) {
        creep.memory.canCall = 0;
        creep.notifyWhenAttacked(false);
    }
    else if(creep.memory.canCall > 0) {
        creep.memory.canCall--;
    }
    
    if(creep.memory.target != creep.room.name) {
	    creep.moveTo(new RoomPosition(25, 25, creep.memory.target), {range: 23, costCallback: find.avoidSourceKeepersCallback});
	}
    else {
        var enemy = creep.pos.findClosestByRange(find.getHostileCreeps(creep.room));
        
        if(enemy == null) {
            enemy = creep.pos.findClosestByRange(creep.room.find(FIND_HOSTILE_CREEPS));
        }
        
        // don't attack, even if they're unlucky and end up in the room after an NPC attack
        if(enemy && Memory.WHITELIST.includes(enemy.owner.username)) {
            enemy = null;
        }

        if(enemy != null) {
            creep.attack(enemy);
            creep.moveTo(enemy);
        }
        else {
            const spawn = creep.pos.findClosestByRange(find.getSpawns(creep.room));
            if(spawn && spawn.recycleCreep(creep) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, {range: 1});
            }
            else if(creep.pos.getRangeTo(creep.room.controller) > 4) {
                creep.moveTo(creep.room.controller, {range: 4});
            }
            else if(creep.pos.lookFor(LOOK_STRUCTURES).length > 0) {
                // don't stand on roads
                const dirs = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
                creep.move(dirs[Math.floor(Math.random() * dirs.length)]);
            }
        }
    }
    
    if(creep.hits < (0.5 * creep.hitsMax) && creep.memory.canCall == 0) {
        if(!Memory.HEALER_REQUESTS) {
            Memory.HEALER_REQUESTS = [];
        }
        Memory.HEALER_REQUESTS.unshift(creep.room.name);
        creep.memory.canCall = 150;
    }
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 190);
    if(numOfPart > maxProtectorParts){numOfPart = maxProtectorParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
    }
    for(let i = 0; i < numOfPart; i++) {
        body.push(ATTACK);
    }

    var mem = {role: 'protector', home: spawn.room.controller.id, long_range: true, canCall: -1, target: Memory.PROTECTOR_REQUESTS.pop()};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else{
        find.addRole(Game.creeps[name], 'protector');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    if(!Memory.PROTECTOR_REQUESTS) {
        Memory.PROTECTOR_REQUESTS = [];
    }
    return Memory.PROTECTOR_REQUESTS.length > 0 && Game.map.getRoomLinearDistance(room.name, Memory.PROTECTOR_REQUESTS[Memory.PROTECTOR_REQUESTS.length - 1]) <= 1 &&
        (!Memory.HEALER_REQUESTS || Memory.HEALER_REQUESTS.length == 0);
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};