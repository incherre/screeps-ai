/*
This is the AI for the miner role.
A miner should mine resources from a mineral deposit and put them in either a terminal or a storage unit. (TODO: storage unit)
*/

// ***** Options *****
var maxMinerParts = 49;
var idealBody = [MOVE, WORK, WORK, WORK, WORK];
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
	var stomachKeys = Object.keys(creep.carry);
	if((find.getMineral(creep.room) == undefined || find.getMineral(creep.room).mineralAmount == 0) && find.getSpawns(creep.room).length > 0 && _.sum(creep.carry) == 0) { // there is nothing for the miner to do until the mineral regenerates
		var recSpawn = creep.pos.findClosestByRange(find.getSpawns(creep.room));
		if(recSpawn.recycleCreep(creep) == ERR_NOT_IN_RANGE){
			creep.moveTo(recSpawn, {maxRooms: 1});
		}
	}
	else if(stomachKeys.length > 1 || creep.carry[RESOURCE_ENERGY] > 0) { // the carry object always contains an "energy" property. If it has anything else, we want to drop that off.
		creep.room.visual.text("💰", creep.pos);
		var target = creep.room.terminal; // this is the line to change to finish the TODO described in the header comment
		var type = stomachKeys[stomachKeys.length - 1];
		if(creep.transfer(target, type) == ERR_NOT_IN_RANGE) {
			creep.moveTo(target, {maxRooms: 1});
		}
	}
	else if(find.getExtractors(creep.room).length > 0 && find.getExtractors(creep.room)[0].cooldown == 0) { // if there is nothing to deposit and we can, then we will mine.
		var target = find.getMineral(creep.room);
		var retVal = creep.harvest(target);
		if(retVal == ERR_NOT_IN_RANGE) {
			creep.moveTo(target, {maxRooms: 1});
		}
		else if(retVal == OK) {
			creep.room.visual.text("⛏️", creep.pos);
		}
	}
	else if(find.getExtractors(creep.room).length > 0 && find.getExtractors(creep.room)[0].cooldown > 1 &&
			find.getCreepLink(creep) != undefined && find.getCreepLink(creep).energy > 0 &&
			creep.room.terminal != undefined && creep.room.terminal.store[RESOURCE_ENERGY] < creep.room.terminal.storeCapacity / 15) { // if there is energy near us, grab it
		creep.withdraw(find.getCreepLink(creep), RESOURCE_ENERGY);
		creep.room.visual.text("🔍", creep.pos);
	}
}

var _make = function(spawn, energy_limit) {
	var temp_energy = energy_limit - 50;
    var body = [];
    for(let i = 0; i < maxMinerParts; i++) {
        if(temp_energy >= BODYPART_COST[idealBody[i % idealBody.length]]) {
            body.push(idealBody[i % idealBody.length]);
            temp_energy -= BODYPART_COST[idealBody[i % idealBody.length]];
        }
        else {
            break;
        }
    }
    body.push(CARRY);

    var mem = {role: 'miner', home: spawn.room.controller.id, long_range: false};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'miner');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMine = function(room) {
	return room.terminal != undefined && find.getMineral(room) != undefined && find.getMineral(room).mineralAmount > 0 && find.getExtractors(room).length > 0;
}

var _shouldMake = function(room) {
	if(_shouldMine(room)) {
		return find.getRole(room, 'miner').length < 1;
	}
	else {
		return false;
	}
}

module.exports = {
    run: _run,
	make: _make,
	shouldMake: _shouldMake
};