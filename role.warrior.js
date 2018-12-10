/*
This is the AI for the warrior role.
A warrior should go to a flag.
Once a warrior is in the same room as it's flag, if there are enemy creeps, it will attack them
*/

// ***** Options *****
var maxWarriorParts = 12;
var flagName = 'power';
var warriorCount = 4;
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(!Game.flags.hasOwnProperty(flagName) && _.sum(creep.carry) == 0) {
        const room = Game.getObjectById(creep.memory.home).room;
        if(room.name != creep.room.name) {
            creep.moveTo(room.controller, {range: 10, reusePath: 20});
        }
        else {
            const spawn = creep.pos.findClosestByRange(find.getSpawns(creep.room));
            creep.moveTo(spawn, {range: 1});
            spawn.recycleCreep(creep);
        }
        return;
    }
    
    const flag = Game.flags[flagName];
    const homeStorage = Game.getObjectById(creep.memory.home).room.terminal;
    const powerBank = find.getPowerBank(creep.room);
    const powers = creep.room.find(FIND_DROPPED_RESOURCES, {filter: (resource) => {return resource.resourceType == RESOURCE_POWER;}});

    if(_.sum(creep.carry) > 0 && homeStorage) {
        if(creep.transfer(homeStorage, RESOURCE_POWER) == ERR_NOT_IN_RANGE) {
            creep.moveTo(homeStorage, {range: 1});
        }
    }
    else if(creep.room.name != flag.pos.roomName) {
        creep.moveTo(flag, {range: 1, reusePath: 20});
    }
    else if(creep.getActiveBodyparts(ATTACK) == 0 && powerBank) {
        if(creep.pos.getRangeTo(powerBank) <= 2) {
            const dir = powerBank.pos.getDirectionTo(creep);
            creep.move(dir);
        }
    }
    else if(powerBank) {
        if(creep.attack(powerBank) == ERR_NOT_IN_RANGE) {
            creep.moveTo(powerBank, {range: 1});
        }
    }
    else if(powers.length > 0 && creep.ticksToLive > 150) {
        const power = creep.pos.findClosestByRange(powers);
        if(creep.pickup(power) == ERR_NOT_IN_RANGE) {
            creep.moveTo(power, {range: 1});
        }
    }
    else if(flag) {
        creep.moveTo(flag, {range: 1});
    }
}

var _make = function(spawn, energy_limit) {
    const flag = Game.flags[flagName];
    const stillAttacking = flag && (!flag.room || flag.pos.lookFor(LOOK_STRUCTURES).length > 0);
    const bodyCost = BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY] + BODYPART_COST[ATTACK];
    var numOfPart = Math.floor(energy_limit / bodyCost);
    if(numOfPart > maxWarriorParts){numOfPart = maxWarriorParts;}

    var body = [];
    if(stillAttacking) {
        for(let i = 0; i < numOfPart; i++) {
            body.push(MOVE);
        }
        for(let i = 0; i < numOfPart; i++) {
            body.push(ATTACK);
        }
    }
    for(let i = 0; i < numOfPart; i++) {
        body.push(CARRY);
    }
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
    }

    var mem = {role: 'warrior', home: spawn.room.controller.id, long_range: true};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else{
        find.addRole(Game.creeps[name], 'warrior');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        
        if(!Memory.HEALER_REQUESTS) {
            Memory.HEALER_REQUESTS = [];
        }
        
        if(stillAttacking) {
            // only send new healers if there is still a power bank
            Memory.HEALER_REQUESTS.unshift(flagName);
        }
        
        return total;
    }
}

var _shouldMake = function(room) {
    if(!Game.flags.hasOwnProperty(flagName)) {
        return false;
    }
    
    const flag = Game.flags[flagName];
    if(flag.pos.roomName == room.name) {
        return false;
    }

    if(Game.map.getRoomLinearDistance(room.name, flag.pos.roomName) > 2) {
        return false;
    }
    
    if(Memory.HEALER_REQUESTS && Memory.HEALER_REQUESTS.indexOf(flagName) != -1) {
        return false;
    }
    
    const warriors = _.filter(Game.creeps, (creep) => {return creep.memory.role == 'warrior';});
    return warriors.length < warriorCount;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};