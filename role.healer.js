/*
This is the AI for the healer role.
A healer should go to the room specified by healFlag and heal the friendly creep with the lowest percent health.
*/

// ***** Options *****
var maxHealerParts = 25;
var warriorFlagName = 'power';
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(creep.memory.notify && !creep.spawning) {
        creep.memory.notify = false;
        creep.notifyWhenAttacked(false);
    }

    var targets = _.filter(find.getHurtCreeps(creep.room), (hurtCreep) => {return hurtCreep.name != creep.name;});

    if(creep.room.name != creep.memory.target) {
        creep.moveTo(new RoomPosition(25, 25, creep.memory.target), {costCallback: find.avoidSourceKeepersCallback});
        if(creep.hits < creep.hitsMax) {
            creep.heal(creep);
        }
    }
    else if(targets.length > 0) {
        var target = creep.pos.findClosestByRange(find.getHurtCreeps(creep.room))

        creep.moveTo(target);
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
            creep.moveTo(protector);
        }
    }
    else {
        let protector = creep.pos.findClosestByRange(find.getRole(creep.room, 'protector'));
        if(protector) {
            creep.moveTo(protector);
        }
    }
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 300);
    if(numOfPart > maxHealerParts){numOfPart = maxHealerParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
    }
    for(let i = 0; i < numOfPart; i++) {
        body.push(HEAL);
    }

    const healerRoom = Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1];
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
    
    if(Game.flags.hasOwnProperty(warriorFlagName) && Memory.HEALER_REQUESTS.length > 0) {
        const topRequest = Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1];
        if(topRequest == Game.flags[warriorFlagName].pos.roomName) {
            return Game.map.getRoomLinearDistance(room.name, Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1]) <= 2;
        }
    }
    
    return Memory.HEALER_REQUESTS.length > 0 && Game.map.getRoomLinearDistance(room.name, Memory.HEALER_REQUESTS[Memory.HEALER_REQUESTS.length - 1]) <= 1;
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};