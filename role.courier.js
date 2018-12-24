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
var capacityConstant = .3; // should be set the same as the one in controller.room
var powerFillConstant = 0.25;
// ***** End *****

var find = require('manager.roomInfo');
const roomLabTypes = {
    'E1S7': [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_LEMERGIUM],
    'E3S4': [RESOURCE_UTRIUM_LEMERGITE, RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM, RESOURCE_LEMERGIUM_ACID, RESOURCE_OXYGEN],
    'E7S3': [RESOURCE_ZYNTHIUM],
    'W6N17': [RESOURCE_LEMERGIUM, RESOURCE_UTRIUM],
};
const roomLabProducts = {
    'E1S7': [RESOURCE_LEMERGIUM_ACID],
    'W6N17': [RESOURCE_UTRIUM_LEMERGITE],
    'E3S4': [RESOURCE_GHODIUM],
};

var _powerCarryTotal = function(room) {
    if(!room.hasOwnProperty('POWER_CARRY_TOTAL')) {
        let total = 0;
        for(let creep of find.getRole(room, 'courier')) {
            if(creep.carry[RESOURCE_POWER]) {
                total += creep.carry[RESOURCE_POWER];
            }
        }
        room.POWER_CARRY_TOTAL = total;
    }
    return room.POWER_CARRY_TOTAL;
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
	else if(creep.memory.working && (carrySum == creep.carryCapacity || creep.carry[RESOURCE_POWER])) {
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
        
        var powerSpawn = find.getPowerSpawn(creep.room);
        var powerNeeded = find.getFillables(creep.room).length == 0 && powerSpawn && (powerSpawn.power + _powerCarryTotal(creep.room)) < (powerFillConstant * POWER_SPAWN_POWER_CAPACITY) && creep.room.terminal && creep.room.terminal.store[RESOURCE_POWER];
        // if nothing needs filling, the power spawn exists and is empty, the terminal exists and has power, and no other courier is getting power, then it should get some power for the power spawn
        
        if(target == null && powerNeeded && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > (capacityConstant * STORAGE_CAPACITY) + POWER_SPAWN_ENERGY_CAPACITY) {
            // if the storage is filling up, get power a little sooner than you would otherwise
            target = creep.room.terminal;
            resource = RESOURCE_POWER;
        }
        
        if(target == null) {
            target = creep.pos.findClosestByRange(find.getContainerEnergy(creep.room), {filter: (container) => {return container.creep || (container.store[RESOURCE_ENERGY] >= (creep.carryCapacity - carrySum));}});
        }
        
        const terminalEnergyThreshold = (TERMINAL_CAPACITY / 15) + (creep.carryCapacity - carrySum);
        if(target == null && creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] < 10000 && creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY] > terminalEnergyThreshold) {
            target = creep.room.terminal;
        }
        
        if(target == null && powerNeeded) {
            // normal time to get power
            target = creep.room.terminal;
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
                    if(labs[i].mineralAmount > (creep.carryCapacity - carrySum) && labProducts.indexOf(labs[i].mineralType) >= 0 && creep.room.terminal && 
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
                        let lab = find.getLabWith(creep.room, labTypes[i]);
                        if(lab != null && lab.mineralAmount < (lab.mineralCapacity * 0.75)) {
                            target = creep.room.terminal;
                            resource = labTypes[i];
                            break;
                        }
                    }
                }
            }
        }
        
        if(target == null) {
            let nuker = find.getNuker(creep.room);
            if(nuker && nuker.ghodium < nuker.ghodiumCapacity && creep.room.terminal && creep.room.terminal.store[RESOURCE_GHODIUM]) {
                target = creep.room.terminal;
                resource = RESOURCE_GHODIUM;
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
                if(ret == OK && creep.room.hasOwnProperty('GROUND_ENERGY')) {
                    // prevent several couriers targeting the same energy in the same tick
                    for(let i = 0; i < creep.room.GROUND_ENERGY.length; i++) {
                        if(creep.room.GROUND_ENERGY[i].id == target.id) {
                            creep.room.GROUND_ENERGY[i] = creep.room.GROUND_ENERGY[creep.room.GROUND_ENERGY.length - 1];
                            creep.room.GROUND_ENERGY.pop();
                            break;
                        }
                    }
                }
            }
            else if(resource == RESOURCE_POWER) {
                ret = creep.withdraw(target, resource, Math.min(POWER_SPAWN_POWER_CAPACITY, creep.room.terminal.store[RESOURCE_POWER]));
            }
            else{
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
            target = find.getPowerSpawn(creep.room);
            if(!target || target.power > target.powerCapacity * (1 - powerFillConstant)) {
                target = creep.room.terminal;
            }
        }
        else if(labTypes.indexOf(resource) >= 0) {
            target = find.getLabWith(creep.room, resource);
            if(target == null || target.mineralAmount > (target.mineralCapacity * 0.75)) {
                if(resource == RESOURCE_GHODIUM) {
                    target = find.getNuker(creep.room);
                    if(!target || target.ghodium == target.ghodiumCapacity) {
                        target = creep.room.terminal;
                    }
                }
                else {
                    target = creep.room.terminal;
                }
            }
        }
        else if(resource == RESOURCE_GHODIUM) {
            target = find.getNuker(creep.room);
            if(target && target.ghodium == target.ghodiumCapacity) {
                target = creep.room.terminal;
            }
        }
        
        if(target == null && labProducts.indexOf(resource) >= 0) {
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