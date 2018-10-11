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

var _run = function(creep){
    if(!creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = true;
        creep.say('gathering');
	}
	else if(creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = false;
	    creep.say('depositing');
	}

    if(creep.memory.working){
        var energy = _.filter(find.getGroundEnergy(creep.room), (resource) => {return !resource.pos.inRangeTo(creep.room.controller, controllerRange) && resource.amount > energyMin && (resource.amount >= resourceThreshold || creep.pos.inRangeTo(resource, resourceRange));});
        var target = null;
        var ground = false;

        if(energy.length > 0){
            target = creep.pos.findClosestByRange(energy);
            ground = true;
        }
        else {
            target = creep.pos.findClosestByRange(find.getContainerEnergy(creep.room), {filter: (container) => {return container.store[RESOURCE_ENERGY] >= resourceThreshold || creep.pos.inRangeTo(container, resourceRange);}});
        }

        if(target == null){target = creep.room.storage;}

        if(target != null){
            var ret;
            if(ground){
                ret = creep.pickup(target);
            }
            else {
                ret = creep.withdraw(target, RESOURCE_ENERGY);
            }
            if(ret == ERR_NOT_IN_RANGE){
                creep.moveTo(target, {ignoreRoads: true});
            }
        }
    }
    else {
        var target = creep.pos.findClosestByRange(find.getFillables(creep.room));
        if(target == null){target = creep.room.storage;}

        if(target == null){
            if(creep.pos.inRangeTo(creep.room.controller, controllerRange)) {
                creep.drop(RESOURCE_ENERGY);
            }
            else {
                creep.moveTo(creep.room.controller, {ignoreRoads: true, range: controllerRange});
            }
        }
        else if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
               creep.moveTo(target, {ignoreRoads: true});
        }
    }
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 100);
    if(numOfPart > maxCourierParts){numOfPart = maxCourierParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(MOVE);
        body.push(CARRY);
    }

    var mem = {role: 'courier', home: spawn.room.controller.id, long_range: false, working: true};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        find.addRole(Game.creeps[retVal], 'courier');
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room){
    if(find.getRoads(room).length > roadThresh){
        return find.getRole(room, 'courier').length < (find.getRole(room, 'harvester').length + 2);
    }
    else{
        return find.getRole(room, 'courier').length < (find.getRole(room, 'harvester').length + 1);
    }
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};