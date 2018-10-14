/*
This is the AI for the courier role.
A courier should find dropped energy or energy in containers and pick it up until full.
Once a courier is full, it should take the energy to fillable structures.
*/

// ***** Options *****
var maxCourierParts = 12;
var resourceThreshold = 100;
var resourceRange = 1;
var roadThresh = 90;
var energyMin = 12;
var controllerRange = 2;
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(!creep.memory.working && _.sum(creep.carry) == 0) {
        creep.memory.working = true;
        creep.say('gathering');
	}
	else if(creep.memory.working && _.sum(creep.carry) == creep.carryCapacity) {
	    creep.memory.working = false;
	    creep.say('depositing');
	}

    if(creep.memory.working) {
        var energy = [];
        var target = null;
        var ground = false;
        var resource = RESOURCE_ENERGY;
        
        if(find.getHostileCreeps(creep.room).length == 0) { // avoid going near battles just to collect stuff
            if(find.getGroundMinerals(creep.room).length > 0) {
                target = creep.pos.findClosestByRange(find.getGroundMinerals(creep.room));
                ground = true;
            }
            else if(find.getTombstoneMinerals(creep.room).length > 0) {
                target = creep.pos.findClosestByRange(find.getGroundMinerals(creep.room));
                resource = _.filter(Object.keys(target.store), (resource) => {return resource != RESOURCE_ENERGY;})[0];
            }
        }
        
        if(target == null) {
            energy = _.filter(find.getGroundEnergy(creep.room), (resource) => {return !resource.pos.inRangeTo(creep.room.controller, controllerRange) && resource.amount > energyMin && (resource.amount >= resourceThreshold || creep.pos.inRangeTo(resource, resourceRange));});
        }
        
        if(target == null && energy.length > 0) {
            target = creep.pos.findClosestByRange(energy);
            ground = true;
        }
        
        if(target == null) {
            target = creep.pos.findClosestByRange(find.getContainerEnergy(creep.room), {filter: (container) => {return container.store[RESOURCE_ENERGY] >= resourceThreshold || creep.pos.inRangeTo(container, resourceRange);}});
        }
        
        if(target == null) {
            target = creep.room.storage;
        }

        if(target != null) {
            var ret;
            if(ground) {
                ret = creep.pickup(target);
            }
            else {
                ret = creep.withdraw(target, resource);
            }
            if(ret == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {ignoreRoads: true, swampCost: 2});
            }
        }
    }
    else {
        var resource = RESOURCE_ENERGY;
        if(creep.room.storage && Object.keys(creep.carry).length > 1) {
            resource = _.filter(Object.keys(creep.carry), (resource) => {return resource != RESOURCE_ENERGY;})[0];
        }

        var target = creep.pos.findClosestByRange(find.getFillables(creep.room));
        if(target == null || resource != RESOURCE_ENERGY) {
            target = creep.room.storage;
        }

        if(target == null) {
            if(creep.pos.inRangeTo(creep.room.controller, controllerRange)) {
                creep.drop(resource);
            }
            else {
                creep.moveTo(creep.room.controller, {range: controllerRange});
            }
        }
        else if(creep.transfer(target, resource) == ERR_NOT_IN_RANGE) {
               creep.moveTo(target);
        }
    }
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 100);
    if(numOfPart > maxCourierParts){numOfPart = maxCourierParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
        body.push(CARRY);
    }

    var mem = {role: 'courier', home: spawn.room.controller.id, long_range: false, working: true};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'courier');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    if(find.getRoads(room).length > roadThresh) {
        return find.getRole(room, 'courier').length < (find.getRole(room, 'harvester').length + 2);
    }
    else {
        return find.getRole(room, 'courier').length < (find.getRole(room, 'harvester').length + 1);
    }
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};