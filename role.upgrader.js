/*
This is the AI for the upgrader role.
An upgrader should take energy from "energy stores."
Once an upgrader is full, it should use the energy to upgrade the room controller.
*/

// ***** Options *****
var maxUpgraderParts = 10;
var capacityConstant = .3;

var ttlThreshold = 1400;
var boostType = RESOURCE_GHODIUM_ACID;
var boostRooms = ['W6N17'];
// ***** End *****

var upperCapacityConstant = Math.min(1 - ((1 - capacityConstant) / 2), capacityConstant * 2);
var find = require('manager.roomInfo');

// copied from courier, just as a temporary measure
var _getLabWith = function(room, resource) {
    let labs = find.getLabs(room);
    let backup = null;
    
    for(let i in labs) {
        if(labs[i].mineralAmount == 0) {
            backup = labs[i];
        }
        else if(labs[i].mineralType == resource) {
            return labs[i];
        }
    }
    
    return backup;
}

var _run = function(creep) {
    if(creep.ticksToLive > ttlThreshold && !creep.memory.boosted && boostRooms.includes(creep.room.name)) {
        var lab = _getLabWith(creep.room, boostType);
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
        creep.room.visual.text("🔍", creep.pos);
	}
	else if(!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = true;
	    creep.room.visual.text("✨", creep.pos);
	}

	if(creep.memory.working) {
        creep.upgradeController(creep.room.controller);
        creep.moveTo(creep.room.controller, {maxRooms: 1});
    }
    else {
        var target1 = creep.pos.findClosestByRange(find.getGroundEnergy(creep.room));
        var target2 = find.getClosestStore(creep);

        if(target1 != null && creep.room.controller.pos.inRangeTo(target1, 6)) {
            if(creep.pickup(target1) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target1, {maxRooms: 1});
            }
        }
        else if(target2 != null) {
            if(creep.withdraw(target2, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target2, {maxRooms: 1});
            }
        }
        else if(target1 != null) {
            if(creep.pickup(target1) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target1, {maxRooms: 1});
            }
        }
    }
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 200);
    if(numOfPart > maxUpgraderParts){numOfPart = maxUpgraderParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }

    var mem = {role: 'upgrader', home: spawn.room.controller.id, long_range: false, working: false, boosted: false};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'upgrader');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    var target = 0;
    if(room.controller.level <= 3) {
        target = room.controller.level;
    }
    else if(room.storage != undefined && room.storage.store[RESOURCE_ENERGY] > (room.storage.storeCapacity * upperCapacityConstant)) {
        target = 3;
    }
    else if(room.storage != undefined && room.storage.store[RESOURCE_ENERGY] > (room.storage.storeCapacity * capacityConstant)) {
        target = 2;
    }
    else {
        target = 1;
    }
    
    if(room.controller.level == 8) {
        target = Math.min(Math.ceil(15 / maxUpgraderParts), target);
    }

    return find.getRole(room, 'upgrader').length < target;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};