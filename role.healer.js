/*
This is the AI for the healer role.
A healer should go to the room specified by healFlag and heal the friendly creep with the lowest percent health.
*/

// ***** Options *****
var maxHealerParts = 12;
var warriorFlagName = 'power';
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(creep.memory.notify && !creep.spawning) {
        creep.memory.notify = false;
        creep.notifyWhenAttacked(false);
    }

    var targets = _.filter(find.getHurtCreeps(creep.room), (hurtCreep) => {return hurtCreep.name != creep.name;});
    var targetName = creep.memory.target;
    
    if(targetName == warriorFlagName) {
        // handle when the healer is power harvesting
        if(Game.flags.hasOwnProperty(warriorFlagName)) {
            targetName = Game.flags[warriorFlagName].pos.roomName;
        }
        else if(Game.getObjectById(creep.memory.home)) {
            // if there's no power flag, go home and recycle
            targetName = Game.getObjectById(creep.memory.home).pos.roomName;
            if(creep.room.name == targetName) {
                var recSpawn = creep.pos.findClosestByRange(find.getSpawns(creep.room));
        		if(recSpawn && recSpawn.recycleCreep(creep) == ERR_NOT_IN_RANGE) {
        		    creep.moveTo(recSpawn, {maxRooms: 1, range: 1});
        		    return;
        		}
            }
        }
    }

    if(creep.room.name != targetName) {
        creep.moveTo(new RoomPosition(25, 25, targetName), {costCallback: find.avoidSourceKeepersCallback, range: 23});
        if(creep.hits < creep.hitsMax) {
            creep.heal(creep);
        }
    }
    else if(targets.length > 0) {
        var target = creep.pos.findClosestByRange(find.getHurtCreeps(creep.room))

        creep.moveTo(target, {costCallback: find.avoidPowerBankCallback, range: 1});
        if(creep.pos.isNearTo(target)) {
            creep.heal(target);
        }
        else {
            creep.rangedHeal(target);
        }
    }
    else if(creep.hits < creep.hitsMax) {
        creep.heal(creep);
        let protector = creep.pos.findClosestByRange(find.getRole(creep.room, 'protector'));
        if(protector) {
            creep.moveTo(protector, {range: 2});
        }
    }
    else if(creep.memory.target == warriorFlagName && Game.flags.hasOwnProperty(warriorFlagName)) {
        creep.moveTo(Game.flags[warriorFlagName], {range: 4});
    }
    else {
        let protector = creep.pos.findClosestByRange(find.getRole(creep.room, 'protector'));
        if(protector) {
            creep.moveTo(protector, {range: 2});
        }
    }
}

var _make = function(spawn, energy_limit) {
    const healerRoom = Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1];
    var max = maxHealerParts;
    if(healerRoom == warriorFlagName) {
        // make bigger healers when harvesting power
        max = 25;
    }
    
    var numOfPart = Math.floor(energy_limit / 300);
    if(numOfPart > max){numOfPart = max;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
    }
    for(let i = 0; i < numOfPart; i++) {
        body.push(HEAL);
    }

    var mem = {role: 'healer', home: spawn.room.controller.id, long_range: true, notify: true, target: healerRoom};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        Memory.HEALER_REQUESTS.pop();
        find.addRole(Game.creeps[name], 'healer');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    if(!Memory.HEALER_REQUESTS) {
        Memory.HEALER_REQUESTS = [];
    }
    
    if(Memory.HEALER_REQUESTS.length > 0) {
        const topRequest = Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1];
        if(topRequest == warriorFlagName && Game.flags.hasOwnProperty(warriorFlagName)) {
            return Game.map.getRoomLinearDistance(room.name, Game.flags[warriorFlagName].pos.roomName) <= 2;
        }
        else if(topRequest == warriorFlagName) {
            Memory.HEALER_REQUESTS.pop();
            return false;
        }
    }
    
    return Memory.HEALER_REQUESTS.length > 0 && Game.map.getRoomLinearDistance(room.name, Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1]) <= 1;
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};