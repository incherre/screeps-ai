/*
This is the AI for the long distance harvester role.
These creeps should harvest energy from adjacent rooms and bring it back to the colony.
*/

// ***** Options *****
var maxLdhParts = 7;
var targets = [
    {source: {room: "E1S6", id:"5bbcacfc9099fc012e6366d9"}, dropoff: {room: "E1S7", id:"5bbe54b11b8845779a1e79ea"}},
    {source: {room: "E3S5", id:"5bbcad189099fc012e6369e3"}, dropoff: {room: "E3S4", id:"5bc2a5132183d2326fc83ea7"}}
];
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep) {
    if(creep.memory.canCall > 0) {
        creep.memory.canCall--;
    }

    if(!creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = true;
        creep.say('harvesting');
	}
	else if(creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = false;
	    creep.say('depositing');
	}
	
	if(creep.memory.working) {
	    if(creep.memory.source.room != creep.room.name) {
	        creep.moveTo(new RoomPosition(25, 25, creep.memory.source.room), {costCallback: find.avoidSourceKeepersCallback});
	    }
	    else if(creep.pos.findInRange(FIND_TOMBSTONES, 1, {filter: (stone) => {return stone.store[RESOURCE_ENERGY] > 0;}}).length > 0) {
	        creep.withdraw(creep.pos.findInRange(FIND_TOMBSTONES, 1, {filter: (stone) => {return stone.store[RESOURCE_ENERGY] > 0;}})[0], RESOURCE_ENERGY);
	        creep.moveTo(Game.getObjectById(creep.memory.source.id));
	    }
	    else if(creep.harvest(Game.getObjectById(creep.memory.source.id)) == ERR_NOT_IN_RANGE) {
	        creep.moveTo(Game.getObjectById(creep.memory.source.id));
	    }
	}
	else {
	    if(creep.memory.dropoff.room != creep.room.name) {
	        if(find.getConstructionSites(creep.room).length > 0) {
	            var site = creep.pos.findClosestByRange(find.getConstructionSites(creep.room));
	            if(creep.build(site) == ERR_NOT_IN_RANGE) {
	                creep.moveTo(site);
	            }
	        }
	        else {
	            var repairable = _.filter(find.getRepairable(creep.room), (structure) => {return creep.pos.inRangeTo(structure, 3);});
	            if(repairable.length > 0) {
	                creep.repair(repairable[0]);
	            }
	            creep.moveTo(new RoomPosition(25, 25, creep.memory.dropoff.room), {costCallback: find.avoidSourceKeepersCallback});
	        }
	    }
	    else if(creep.transfer(Game.getObjectById(creep.memory.dropoff.id), RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
	        creep.moveTo(Game.getObjectById(creep.memory.dropoff.id));
	    }
	    else if(creep.transfer(Game.getObjectById(creep.memory.dropoff.id), RESOURCE_ENERGY) == ERR_FULL) {
	        creep.drop(RESOURCE_ENERGY);
	    }
	}
	
	if(creep.hits < creep.hitsMax && creep.memory.canCall == 0 && creep.memory.source.room == creep.room.name) {
	    var attacks = _.filter(creep.room.getEventLog(), (event) => {return event.event == EVENT_ATTACK && event.data.targetId == creep.id;});
	    if(attacks.length > 0) {
	        if(!Memory.PROTECTOR_REQUESTS) {
                Memory.PROTECTOR_REQUESTS = [];
            }
            
            Memory.PROTECTOR_REQUESTS.unshift(creep.memory.source.room);
            creep.memory.canCall = 150;
	    }
	}
}

var _findTargetNum = function(room) {
    var ldhs = find.getRole(room, 'ldh');
    var sourceCounts = {};

    for(let i in targets) {
        sourceCounts[targets[i].source.id] = {count: 0, num: i, room: targets[i].source.room};
    }
    
    for(let i in ldhs) {
        sourceCounts[ldhs[i].memory.source.id].count++;
    }
    
    for(let i in sourceCounts) {
        let target = 1;
        let roomName = sourceCounts[i].room;
        if(Game.rooms.hasOwnProperty(roomName) && Game.rooms[roomName].controller.reservation) {
            target = 2;
        }

        if(sourceCounts[i].count < target && Game.map.getRoomLinearDistance(room.name, roomName) <= 1 && (!Memory.PROTECTOR_REQUESTS || Memory.PROTECTOR_REQUESTS.indexOf(roomName) == -1)) {
            return sourceCounts[i].num;
        }
    }
    
    return -1;
}

var _make = function(spawn, energy_limit) {
    var numOfPart = Math.floor(energy_limit / 200);
    if(numOfPart > maxLdhParts){numOfPart = maxLdhParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
    }
    
    var targetNum = _findTargetNum(spawn.room);
    var mem = {role: 'ldh', home: spawn.room.controller.id, long_range: true, working: false, source: targets[targetNum].source, dropoff: targets[targetNum].dropoff, canCall: 0};
    var name = find.creepNames[Math.floor(Math.random() * find.creepNames.length)] + ' ' + spawn.name + Game.time;
    var retVal = spawn.spawnCreep(body, name, {memory: mem});

    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[name], 'ldh');
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
    return _findTargetNum(room) >= 0;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};