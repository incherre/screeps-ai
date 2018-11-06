/*
This is the AI for the pioneer role.
A pioneer should attempt to build a spawn in a new room.
*/
 
// ***** Options *****
var maxPioneerParts = 11; // the maximum number of parts a pioneer can have
var maxPioneers = 4;
var _target = 'W6N17'; // W6N17 // set to undefined to turn off
var _portal = 'E5S5'; // set to undefined to turn off
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = false;
	}
	else if(!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = true;
	}
	
	if(creep.room.name == creep.memory.portal) {
	    const portal = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (struct) => { return struct.structureType == STRUCTURE_PORTAL; }});
	    if(portal) {
	        creep.moveTo(portal);
	        creep.memory.goneThrough = true;
	    }
	}
	else if(creep.room.name != creep.memory.target && creep.memory.portal && !creep.memory.goneThrough) {
	    creep.moveTo(new RoomPosition(25, 25, creep.memory.portal), {costCallback: find.avoidSourceKeepersCallback});
	}
    else if(creep.room.name != creep.memory.target && (!creep.memory.portal || creep.memory.goneThrough)) {
        creep.moveTo(new RoomPosition(25, 25, creep.memory.target), {costCallback: find.avoidSourceKeepersCallback});
    }
    else if(!creep.room.controller.my && creep.getActiveBodyparts(CLAIM) > 0) {
        if(creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller);
        }
    }
    else {
        if(creep.memory.working) {
            var target = creep.pos.findClosestByRange(find.getConstructionSites(creep.room));
            if(target != null && creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
			}
			else {
			    target = creep.pos.findClosestByRange(find.getFillables(creep.room));
			    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
			        creep.moveTo(target);
			    }
			}
        }
        else {
            var source = creep.pos.findClosestByRange(find.getSources(creep.room), {filter: (source) => {return (source.energy > 0 && find.isOpen(source, creep))}});
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
    }
}

var _make = function(spawn, energy_limit) {
    var body = [];
    var limit = energy_limit;
    if((!Game.rooms.hasOwnProperty(_target) || !Game.rooms[_target].controller.my) && _.filter(find.getRole(spawn.room, 'pioneer'), (creep) => {return creep.getActiveBodyparts(CLAIM) > 0;}).length == 0) {
        if(limit >= 650) {
            body.push(CLAIM);
            body.push(MOVE);
            limit -= 650;
        }
        else {
            return 0;
        }
    }
    
    while(body.length < maxPioneerParts && limit >= 200) {
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
        limit -= 200;
    }


    var mem = {role: 'pioneer', home: spawn.room.controller.id, long_range: true, target: _target, portal: _portal, goneThrough: false};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else{
        find.addRole(Game.creeps[name], 'pioneer');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    if(!_target) {
        return false;
    }

    if(Game.rooms.hasOwnProperty(_target) && Game.rooms[_target].controller.my && Game.rooms[_target].controller.level >= 3) {
        return false;
    }
    
    if(Game.map.getRoomLinearDistance(room.name, _target) > 4 && (!_portal || Game.map.getRoomLinearDistance(room.name, _portal) > 3)) {
        return false;
    }
    
    return _target && find.getRole(room, 'pioneer').length < maxPioneers;
}

module.exports = {
    target: _target,
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};