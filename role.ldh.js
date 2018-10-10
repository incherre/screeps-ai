/*
This is the AI for the long distance harvester role.
These creeps should harvest energy from adjacent rooms and bring it back to the colony.
*/

// ***** Options *****
var maxLdhParts = 8;
var targets = [ {source: {room: "E1S6", id:"5bbcacfc9099fc012e6366d9"}, dropoff: {room: "E1S7", id:"5bbe54b11b8845779a1e79ea"}} ];
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(!creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = true;
        creep.say('harvesting');
	}
	else if(creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = false;
	    creep.say('depositing');
	}
	
	if(creep.memory.working) {
	    if(creep.memory.source.room != creep.room.name) {
	        creep.moveTo(new RoomPosition(25, 25, creep.memory.source.room));
	    }
	    else if(creep.harvest(Game.getObjectById(creep.memory.source.id)) == ERR_NOT_IN_RANGE) {
	        creep.moveTo(Game.getObjectById(creep.memory.source.id));
	    }
	}
	else {
	    if(creep.memory.dropoff.room != creep.room.name) {
	        creep.moveTo(new RoomPosition(25, 25, creep.memory.dropoff.room));
	    }
	    else if(creep.transfer(Game.getObjectById(creep.memory.dropoff.id), RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
	        creep.moveTo(Game.getObjectById(creep.memory.dropoff.id));
	    }
	}
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 200);
    if(numOfPart > maxLdhParts){numOfPart = maxLdhParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }
    
    var target_num = 0; //TODO(Daniel): Generalize
    var mem = {role: 'ldh', home: spawn.room.controller.id, long_range: true, working: false, source: targets[target_num].source, dropoff: targets[target_num].dropoff};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        spawn.room.MY_CREEPS.push(Game.creeps[retVal]);
        Game.LDH.push(Game.creeps[retVal]);
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room){
    var target = targets.length * 2;
    return find.getLdh(room).length < target;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};