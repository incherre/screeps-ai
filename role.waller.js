/*
This is the AI for the waller role.
A waller should take energy from "energy stores."
Once a waller is full, it should use the energy to repair walls and ramparts.
*/

// ***** Options *****
var maxWallerParts = 10;
var ttlThreshold = 1400;
var boostType = RESOURCE_LEMERGIUM_ACID;
var boostRooms = ['E3S4'];
var capacityConstant = .9;
// ***** End *****

var upperCapacityConstant = Math.min(1 - ((1 - capacityConstant) / 2), capacityConstant * 2);
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
    if(creep.ticksToLive > ttlThreshold && !creep.memory.boosted && boostRooms.includes(creep.room.name)) {
        var lab = find.getLabWith(creep.room, boostType);
        if(lab && lab.mineralAmount > creep.getActiveBodyparts(WORK) * LAB_BOOST_MINERAL) {
            var retVal = lab.boostCreep(creep);
            if(retVal == OK) {
                creep.memory.boosted = true;
                return;
            }
            else if(retVal == ERR_NOT_IN_RANGE) {
                creep.moveTo(lab);
                return;
            }
        }
    }
    
    if(creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = false;
        creep.memory.target = false;
        creep.room.visual.text("🔍", creep.pos);
	}
	else if(!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = true;
	    creep.room.visual.text("🏯", creep.pos);
	}

	if(creep.memory.working) {
        if(!creep.memory.target && find.getRepairableWalls(creep.room).length > 0) { // should regular repair
            // repair
            var repair = find.getRepairableWalls(creep.room);
            var hitsMin = Math.min.apply(null, repair.map(function(structure){return structure.hits;}));
            var target = creep.pos.findClosestByRange(repair, {filter: (structure) => {return structure.hits == hitsMin;}});
            if(target) {
                creep.memory.target = target.id;
            }
        }

        if(creep.memory.target) {
            if(creep.repair(Game.getObjectById(creep.memory.target)) == ERR_NOT_IN_RANGE) {
                creep.moveTo(Game.getObjectById(creep.memory.target), {costCallback: _obstacles, maxRooms: 1});
			}
        }
        else { // otherwise, upgrade
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {maxRooms: 1});
            }
        }
    }
    else {
        var target = find.getClosestStore(creep);
        if(target != null) {
            if(creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {costCallback: _obstacles, maxRooms: 1});
            }
        }
        else {
            target = creep.pos.findClosestByRange(find.getGroundEnergy(creep.room));
            if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {costCallback: _obstacles, maxRooms: 1});
            }
        }
    }
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 200);
    if(numOfPart > maxWallerParts){numOfPart = maxWallerParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }

    var mem = {role: 'waller', home: spawn.room.controller.id, long_range: false, working: false, target: false, boosted: false};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'waller');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    var target = 0;
    var storageFill = room.storage ? _.sum(room.storage.store) : 0;
    if(find.getRepairableWalls(room).length > 0) {
        if(storageFill >= STORAGE_CAPACITY * upperCapacityConstant) {
            target = 3;
        }
        else if(storageFill >= STORAGE_CAPACITY * capacityConstant) {
            target = 2;
        }
        else {
            target = 1;
        }
    }
    else {
        target = 0;
    }

    return find.getRole(room, 'waller').length < target;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};