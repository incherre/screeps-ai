/*
This is the AI for the long distance harvester role.
These creeps should harvest energy from adjacent rooms and bring it back to the colony.
*/

// ***** Options *****
var maxLdhParts = 9;
var targets = [
    {source: {room: "E1S6",  id: "5bbcacfc9099fc012e6366d9"}, dropoff: {room: "E1S7",  id: "5bbe54b11b8845779a1e79ea"}},
    {source: {room: "E3S5",  id: "5bbcad189099fc012e6369e3"}, dropoff: {room: "E3S4",  id: "5bc2a5132183d2326fc83ea7"}},
    {source: {room: "E6S3",  id: "5bbcad469099fc012e637031"}, dropoff: {room: "E7S3",  id: "5bd09c0f5d1113251e695fec"}},
    {source: {room: "E6S3",  id: "5bbcad469099fc012e63702f"}, dropoff: {room: "E7S3",  id: "5bd09c0f5d1113251e695fec"}},
    {source: {room: "W5N17", id: "5bbcac979099fc012e635ccf"}, dropoff: {room: "W6N17", id: "5be1b2a6b476b366f9f3187c"}}
];
// ***** End *****

var find = require('manager.roomInfo');

var _checkIfAttackedByAlly = function(containedRoom) {
    if(!Memory.WHITELIST || Memory.WHITELIST.length <= 0 || containedRoom.ALREADY_CHECKED_ATTACKED) {
        // make sure there is at least one ally and that we haven't already checked this tick
        return;
    }
    containedRoom.ALREADY_CHECKED_ATTACKED = true;

    const attackEvents = _.filter(containedRoom.getEventLog(), (event) => {
        return event.event == EVENT_ATTACK && event.data.targetId && Game.getObjectById(event.data.targetId).my;
    });
    
    for(let i in attackEvents) {
        const attacker = Game.getObjectById(attackEvents[i].objectId);
        if(attacker && attacker.owner && attacker.owner.username) {
            const allyId = Memory.WHITELIST.indexOf(attacker.owner.username);
            
            if(allyId >= 0) {
                Game.notify("User \"" + attacker.owner.username + "\" was removed from the ally list for bad behavior.");
                Memory.WHITELIST[allyId] = Memory.WHITELIST[Memory.WHITELIST.length - 1];
                Memory.WHITELIST.pop();
            }
        }
    }
}

var _run = function(creep) {
    if(creep.memory.canCall > 0) {
        creep.memory.canCall--;
    }

    if(!creep.memory.working && creep.carry.energy == 0) {
        creep.memory.working = true;
        creep.room.visual.text("⚡", creep.pos);
	}
	else if(creep.memory.working && creep.carry.energy == creep.carryCapacity) {
	    creep.memory.working = false;
	    creep.room.visual.text("🔋", creep.pos);
	}
	
	if(creep.memory.working) {
	    var source = Game.getObjectById(creep.memory.source.id);
	    if(creep.memory.source.room != creep.room.name) {
	        creep.moveTo(new RoomPosition(25, 25, creep.memory.source.room), {costCallback: find.avoidSourceKeepersCallback, maxRooms: 2, range: 23});
	    }
	    else if(creep.pos.findInRange(FIND_TOMBSTONES, 1, {filter: (stone) => {return stone.store[RESOURCE_ENERGY] > 0;}}).length > 0) {
	        creep.withdraw(creep.pos.findInRange(FIND_TOMBSTONES, 1, {filter: (stone) => {return stone.store[RESOURCE_ENERGY] > 0;}})[0], RESOURCE_ENERGY);
	        creep.moveTo(source, {range: 1});
	    }
	    else if(creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: (resource) => {return resource.resouceType == RESOURCE_ENERGY;}}).length > 0) {
	        creep.pickup(creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: (resource) => {return resource.resouceType == RESOURCE_ENERGY;}})[0]);
	        creep.moveTo(source, {range: 1});
	    }
	    else if(creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1).length > 0) {
	        creep.dismantle(creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1)[0]);
	        creep.moveTo(source, {range: 1});
	    }
	    else if(!creep.pos.isNearTo(source)) {
	        creep.moveTo(source, {range: 1});
	    }
	    else {
	        creep.harvest(source);
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
	            creep.moveTo(new RoomPosition(25, 25, creep.memory.dropoff.room), {costCallback: find.avoidSourceKeepersCallback, maxRooms: 2});
	        }
	    }
	    else {
	        var target = Game.getObjectById(creep.memory.dropoff.id);
	        
	        if(_.sum(target.store) == target.storeCapacity) {
    	        target = creep.room.storage;
    	    }
    	    
    	    var success = creep.transfer(target, RESOURCE_ENERGY);
    	    
    	    if(success == ERR_NOT_IN_RANGE) {
    	        creep.moveTo(target);
    	    }
    	    else if(success == ERR_FULL) {
    	        creep.drop(RESOURCE_ENERGY);
    	    }
	    }
	}
	
	if(creep.hits < creep.hitsMax && creep.memory.canCall == 0 && creep.memory.source.room == creep.room.name) {
	    var attacks = _.filter(creep.room.getEventLog(), (event) => {return event.event == EVENT_ATTACK && event.data.targetId == creep.id;});
	    if(attacks.length > 0) {
	        if(!Memory.PROTECTOR_REQUESTS) {
                Memory.PROTECTOR_REQUESTS = [];
            }
            
            if(Memory.PROTECTOR_REQUESTS.indexOf(creep.memory.source.room) == -1) {
                Memory.PROTECTOR_REQUESTS.unshift(creep.memory.source.room);
                creep.memory.canCall = 150;
                _checkIfAttackedByAlly(creep.room);
            }
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