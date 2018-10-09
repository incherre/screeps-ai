/*
This is the AI for the handyman role.
A handyman should take energy from "energy stores."
Once a handyman is full, it should use the energy to perform a variety of tasks including building, repairing, and harvesting.
If the colony is in dire need, the handyman should act as one of the old style harvesters.
*/

// ***** Options *****
var maxHandymanParts = 8;
var repairsPer = 10;
var resourceThreshold = 100;
var resourceRange = 1;
var roadThresh = 90;
var energyMin = 12;
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = false;
        creep.say('gathering');
	}
	else if(!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = true;
	    creep.say('working');
	}

    if(find.getSpawns(creep.room).length == 0){ // we need to build a spawn!
        if(creep.memory.working){
            // build
            var target = creep.pos.findClosestByRange(find.getConstructionSites(creep.room));
            if(creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
			}
        }
        else {
            var source = creep.pos.findClosestByRange(find.getSources(creep.room), {filter: (source) => {return (source.energy > 0 && find.isOpen(source, creep))}});
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
    }
    else if(find.getHarvesters(creep.room).length == 0 || find.getCouriers(creep.room).length == 0){ // if the colony need someone to get energy, act as an inefficient harvester
        if(creep.memory.working){
            var target = creep.pos.findClosestByRange(_.filter(find.getFillables(creep.room), (structure) => {return (structure.structureType != STRUCTURE_TOWER);}));
            if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        }
        else {
            var source = creep.pos.findClosestByRange(find.getSources(creep.room), {filter: (source) => {return (source.energy > 0 && find.isOpen(source, creep))}});
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
            if(source == null){ // TODO clean up!
                var energy = _.filter(find.getGroundEnergy(creep.room), (resource) => {return resource.amount > energyMin && (resource.amount >= resourceThreshold || creep.pos.inRangeTo(resource, resourceRange));});
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
                        creep.moveTo(target);
                    }
                }
            }
        }
    }
    else {
	    if(creep.memory.working) {
            if(find.getEmergencyRepairable(creep.room).length > 0){ // should emergency repair
                // repair
                var repairs = find.getEmergencyRepairable(creep.room);
                var hitsMin = Math.min.apply(null, repairs.map(function(structure){return structure.hits;}));
                var target = creep.pos.findClosestByRange(repairs, {filter: (structure) => {return structure.hits == hitsMin;}})
                
                if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
			    }
            }
            else if(find.getConstructionSites(creep.room).length > 0){ // should build
                // build
                var target = creep.pos.findClosestByRange(find.getConstructionSites(creep.room));
                if(creep.build(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
			    }
            }
            else if(find.getRepairable(creep.room).length > 0){ // should regular repair
                // repair
                var target = creep.pos.findClosestByRange(find.getRepairable(creep.room));
                
                if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
			    }
            }
            else if(find.getRepairableWalls(creep.room).length > 0){ // should repair walls
                // repair walls
                var repairs = find.getRepairableWalls(creep.room);
                var hitsMin = Math.min.apply(null, repairs.map(function(structure){return structure.hits;}));
                var target = creep.pos.findClosestByRange(repairs, {filter: (structure) => {return structure.hits == hitsMin;}})
                
                if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
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
                    creep.moveTo(target);
                }
            }
            else {
                target = creep.pos.findClosestByRange(find.getGroundEnergy(creep.room));
                if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }
        }
    }
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 200);
    if(numOfPart > maxHandymanParts){numOfPart = maxHandymanParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }

    var mem = {role: 'handyman', home: spawn.room.controller.id, long_range: false, working: false};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        spawn.room.MY_CREEPS.push(Game.creeps[retVal]);
        spawn.room.HANDYMEN.push(Game.creeps[retVal]);
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room){
    var target = 0;
    if(room.controller.level < 3){
        target = room.controller.level;
    }
    else{
        let num = find.getRepairable(room).length + find.getConstructionSites(room).length;
        target = 1 + Math.ceil(num / repairsPer);
    }

    return find.getHandymen(room).length < target;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};