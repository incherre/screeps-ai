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

module.exports.loop = function () {
    creepControl.controlCreeps();
    roomControl.controlEstablishedRooms();

    if(trading.shouldTrade()) {
        trading.trade();
    }
  
    if(Game.time % 7 == 0) {
        var resource = RESOURCE_OXYGEN;
        var room1 = Game.rooms['E3S4'];
        var room2 = Game.rooms['E1S7'];
        var lab = _getLabWith(room2, resource);
    
        if(room1.terminal != undefined && room2.terminal != undefined && lab != null && room1.terminal.store[resource] != undefined && room1.terminal.cooldown == 0) {
            var amountInRoom = lab.mineralAmount;
            if(room2.terminal.store[resource] != undefined) {
                amountInRoom += room2.terminal.store[resource];
            }

            var amount = Math.min(lab.mineralCapacity - amountInRoom, room1.terminal.store[resource]);
            
            if(amount > 500) {
                room1.terminal.send(resource, amount, room2.name);
            }
        }
    }
}
