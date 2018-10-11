/*
This is the AI for the waller role.
A waller should take energy from "energy stores."
Once a waller is full, it should use the energy to repair walls and ramparts.
*/

// ***** Options *****
var maxWallerParts = 8;
// ***** End *****

var find = require('manager.roomInfo');

var _obstacles = function(roomName, costMatrix) {
    if(Game.rooms.hasOwnProperty(roomName)) {
        var ramparts = _.filter(find.getStructures(Game.rooms[roomName]), (structure) => {return structure.structureType == STRUCTURE_RAMPART;});
        for(let i in ramparts) {
            costMatrix.set(ramparts[i].pos.x, ramparts[i].pos.y, 255);
        }
    }
}

var _run = function(creep) {
    if(creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = false;
        creep.say('gathering');
	}
	else if(!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = true;
	    creep.say('walling');
	}

	if(creep.memory.working) {
        if(find.getRepairableWalls(creep.room).length > 0){ // should regular repair
            // repair
            var repair = find.getRepairableWalls(creep.room);
            var hitsMin = Math.min.apply(null, repair.map(function(structure){return structure.hits;}));
            var target = creep.pos.findClosestByRange(repair, {filter: (structure) => {return structure.hits == hitsMin;}})
                
            if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {costCallback: _obstacles});
			}
        }
        else { // otherwise, upgrade
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
        }
    }
    else {
        var target = find.getClosestStore(creep);
        if(target != null){
            if(creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {costCallback: _obstacles});
            }
        }
        else {
            target = creep.pos.findClosestByRange(find.getGroundEnergy(creep.room));
            if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {costCallback: _obstacles});
            }
        }
    }
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 200);
    if(numOfPart > maxWallerParts){numOfPart = maxWallerParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }

    var mem = {role: 'waller', home: spawn.room.controller.id, long_range: false, working: false};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        find.addRole(Game.creeps[retVal], 'waller');
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room){
    var target = 0;
    if(find.getRepairableWalls(room).length > 0){
        target = 1;
    }
    else{
        target = 0;
    }

    return find.getRole(room, 'waller').length < target;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};