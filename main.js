/*
Directions for use:
-Every room needs a flag with primary color white and secondary color yellow for extension placement.
-Every room will produce warriors that will go to a flag with both primary and secondary color red if it exists.
-If there is a flag called 'raid' (this name is defined in the raider role) anywhere in the world, the colonies will produce raiders that walk to it.
-If there is a flag called 'heal' (this name is defined in the raider role) anywhere in the world, the raiders will walk to it if injured.
-If there is a flag called 'claim' (this name is defined in the claimer role) anywhere in the world, the colonies will produce claimers to claim the room the flag is in.
-Every structure besides extensions and extractors must be placed manually.
-Creeps of the miner role will not be spawned until a terminal is built.
-Link pairs must be added by id strings in the room controller module.
*/

var creepControl = require('controller.creeps');
var roomControl = require('controller.room');
var trading = require('controller.market');
var find = require('manager.roomInfo');

// copied from courier, just as a temporary measure
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

var logStuff = function() {
    if(!Memory.stats){ Memory.stats = {}; }
    Memory.stats['cpu.getUsed'] = Game.cpu.getUsed();
    Memory.stats['cpu.limit'] = Game.cpu.limit;
    Memory.stats['cpu.bucket'] = Game.cpu.bucket;
    
    Memory.stats['gcl.progress'] = Game.gcl.progress;
    Memory.stats['gcl.progressTotal'] = Game.gcl.progressTotal;
    Memory.stats['gcl.level'] = Game.gcl.level;
    
    for(let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if(room.controller && room.controller.my) {
            Memory.stats['rooms.' + roomName + '.rcl.level'] = room.controller.level;
            Memory.stats['rooms.' + roomName + '.rcl.progress'] = room.controller.progress;
            Memory.stats['rooms.' + roomName + '.rcl.progressTotal'] = room.controller.progressTotal;
    
            Memory.stats['rooms.' + roomName + '.spawn.energy'] = room.energyAvailable;
            Memory.stats['rooms.' + roomName + '.spawn.energyTotal'] = room.energyCapacityAvailable;
    
            if(room.storage){
                Memory.stats['rooms.' + roomName + '.storage.energy'] = room.storage.store.energy;
            }
            
            Memory.stats['rooms.' + roomName + '.enemies'] = find.getHostileCreeps(room).length;
        }
    }
}

module.exports.loop = function () {
    creepControl.controlCreeps();
    roomControl.controlEstablishedRooms();

    if(trading.shouldTrade()) {
        trading.trade();
    }
  
    if(Game.time % 13 == 0) {
        var resourcePairs = [['E1S7', RESOURCE_OXYGEN, 'E3S4'], ['E3S4', RESOURCE_ZYNTHIUM, 'E7S3'], ['E3S4', RESOURCE_UTRIUM_LEMERGITE, 'W6N17'], ['E1S7', RESOURCE_GHODIUM, 'E3S4']];
        
        for(var [destRoomName, resource, sourceRoomName] of resourcePairs) {
            var room1 = Game.rooms[sourceRoomName];
            var room2 = Game.rooms[destRoomName];
            var lab = _getLabWith(room2, resource);
            var amountInRoom = 0;

            if(lab) {
                amountInRoom = lab.mineralAmount;
            }
        
            if(room1.terminal != undefined && room2.terminal != undefined && room1.terminal.store[resource] != undefined && room1.terminal.cooldown == 0) {
                if(room2.terminal.store[resource] != undefined) {
                    amountInRoom += room2.terminal.store[resource];
                }
    
                var amount = Math.min(LAB_MINERAL_CAPACITY - amountInRoom, room1.terminal.store[resource]);
                
                if(amount > 500) {
                    room1.terminal.send(resource, amount, room2.name);
                }
            }
        }
    }
    
    logStuff();
}
