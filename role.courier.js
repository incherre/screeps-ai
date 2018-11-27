/*
This is the AI for the courier role.
A courier should find dropped energy or energy in containers and pick it up until full.
Once a courier is full, it should take the energy to fillable structures.
*/

// ***** Options *****
var maxCourierParts = 14;
var roadThresh = 30;
var rangeMultiple = 1.2;
var controllerRange = 2;
// ***** End *****

var find = require('manager.roomInfo');
const roomLabTypes = {
    'E1S7': [RESOURCE_GHODIUM, RESOURCE_HYDROGEN, RESOURCE_OXYGEN],
    'E3S4': [RESOURCE_UTRIUM_LEMERGITE, RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM],
    'E7S3': [RESOURCE_ZYNTHIUM],
    'W6N17': [RESOURCE_LEMERGIUM, RESOURCE_UTRIUM],
};
const roomLabProducts = {
    'E1S7': [],
    'W6N17': [RESOURCE_UTRIUM_LEMERGITE],
    'E3S4': [RESOURCE_GHODIUM],
};

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

var _getPowerSpawn = function(room) {
    if(!room.hasOwnProperty('POWER_SPAWN')) {
        room.POWER_SPAWN = null;
        var powerSpawns = _.filter(find.getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_POWER_SPAWN && structure.my);});
        if(powerSpawns.length > 0) {
            room.POWER_SPAWN = powerSpawns[0];
        }
    }
    return room.POWER_SPAWN;
}

var _run = function(creep) {
    var carrySum = _.sum(creep.carry);
    if(!creep.memory.working && carrySum == 0) {
        creep.memory.working = true;
        creep.room.visual.text("🔍", creep.pos);
	}
	else if(!creep.memory.working && !creep.room.storage && creep.carry[RESOURCE_ENERGY] == 0) {
	    creep.memory.working = true;
        creep.room.visual.text("🔍", creep.pos);
	}
	else if(creep.memory.working && carrySum == creep.carryCapacity) {
	    creep.memory.working = false;
	    creep.room.visual.text("🔋", creep.pos);
	}
	
	let labTypes = [];
    if(roomLabTypes[creep.room.name]) {
        labTypes = roomLabTypes[creep.room.name];
    }
    
    let labProducts = [];
    if(roomLabProducts[creep.room.name]) {
        labProducts = roomLabProducts[creep.room.name];
    }

    if(creep.memory.working) {
        var energy = [];
        var target = null;
        var ground = false;
        var resource = RESOURCE_ENERGY;
        
        if(find.getHostileCreeps(creep.room).length == 0 && creep.room.storage) { // avoid going near battles just to collect stuff, only pick it up if there's a place to put it
            if(find.getGroundMinerals(creep.room).length > 0) {
                target = creep.pos.findClosestByRange(find.getGroundMinerals(creep.room));
                ground = true;
            }
            else if(find.getTombstoneMinerals(creep.room).length > 0) {
                target = creep.pos.findClosestByRange(find.getTombstoneMinerals(creep.room));
                resource = _.filter(Object.keys(target.store), (resource) => {return resource != RESOURCE_ENERGY;})[0];
            }
        }
        
        if(target == null) {
            energy = _.filter(find.getGroundEnergy(creep.room), (resource) => {return !resource.pos.inRangeTo(creep.room.controller, controllerRange) && resource.amount > (resource.pos.getRangeTo(creep) * rangeMultiple);});
        }
        
        if(target == null && energy.length > 0) {
            target = creep.pos.findClosestByRange(energy);
            ground = true;
        }
        
        if(target == null) {
            target = creep.pos.findClosestByRange(find.getContainerEnergy(creep.room), {filter: (container) => {return container.creep || (container.store[RESOURCE_ENERGY] >= (creep.carryCapacity - carrySum));}});
        }
        
        const terminalEnergyThreshold = (TERMINAL_CAPACITY / 15) + (creep.carryCapacity - carrySum);
        if(target == null && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 10000 && creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY] > terminalEnergyThreshold) {
            target = creep.room.terminal;
        }
        
        var powerSpawn = _getPowerSpawn(creep.room);
        if(target == null && find.getFillables(creep.room).length == 0 && powerSpawn && powerSpawn.power == 0 && creep.room.storage && creep.room.storage.store[RESOURCE_POWER]) {
            // if there's no target, and nothing needs filling, and the power spawn exists and is empty, and the storage exists and has power, then it should get some power for the power spawn
            target = creep.room.storage;
            resource = RESOURCE_POWER;
        }
        
        if(target == null && find.getFillables(creep.room).length == 0) {
            // move minerals around
            if(creep.room.storage) {
                for(let i in labTypes) {
                    if(creep.room.storage.store.hasOwnProperty(labTypes[i])) {
                        target = creep.room.storage;
                        resource = labTypes[i];
                        break;
                    }
                }
            }
            
            if(target == null) {
                let labs = find.getLabs(creep.room);
                for(let i in labs) {
                    if(labs[i].mineralAmount > 0 && labProducts.indexOf(labs[i].mineralType) >= 0 && creep.room.terminal && 
                    (!creep.room.terminal.store.hasOwnProperty(labs[i].mineralType) || creep.room.terminal.store[labs[i].mineralType] < 3000)) {
                        target = labs[i];
                        resource = labs[i].mineralType;
                        break;
                    }
                }
            }
            
            if(target == null && creep.room.terminal) {
                for(let i in labTypes) {
                    if(creep.room.terminal.store.hasOwnProperty(labTypes[i])) {
                        let lab = _getLabWith(creep.room, labTypes[i]);
                        if(lab != null && lab.mineralAmount < (lab.mineralCapacity * 0.75)) {
                            target = creep.room.terminal;
                            resource = labTypes[i];
                            break;
                        }
                    }
                }
            }
        }
        
        if(target == null && creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY] > terminalEnergyThreshold) {
            target = creep.room.terminal;
        }
        
        if(target == null && find.getFillables(creep.room).length > 0) {
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
                creep.moveTo(target, {ignoreRoads: true, swampCost: 2, maxRooms: 1});
            }
        }
    }
    else {
        var resource = RESOURCE_ENERGY;
        if(creep.room.storage && Object.keys(creep.carry).length > 1) {
            resource = _.filter(Object.keys(creep.carry), (resource) => {return resource != RESOURCE_ENERGY;})[0];
        }

        var target = null;
        if(resource == RESOURCE_ENERGY) {
            target = creep.pos.findClosestByRange(find.getFillables(creep.room));
        }
        else if(resource == RESOURCE_POWER) {
            target = _getPowerSpawn(creep.room);
        }
        else if(labTypes.indexOf(resource) >= 0) {
            target = _getLabWith(creep.room, resource);
            if(target == null || target.mineralAmount > (target.mineralCapacity * 0.75)) {
                target = creep.room.terminal;
            }
        }
        else if(labProducts.indexOf(resource) >= 0) {
            target = creep.room.terminal;
        }
        
        if(target == null) {
            target = creep.room.storage;
        }

        if(target == null) {
            if(creep.room.controller && creep.pos.inRangeTo(creep.room.controller, controllerRange)) {
                creep.drop(resource);
            }
            else {
                creep.moveTo(creep.room.controller, {range: controllerRange, maxRooms: 1});
            }
        }
        else if(creep.transfer(target, resource) == ERR_NOT_IN_RANGE) {
               creep.moveTo(target, {maxRooms: 1});
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