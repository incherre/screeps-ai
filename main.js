/*
Directions for use:
-Every main room needs a flag with primary color white and secondary color yellow for extension placement.
-Every structure besides extensions and extractors must be placed manually. Towers are expecially important.
-Creeps of the miner role will not be spawned until a terminal is built. (Terminal should be built near the mineral)
-Link pairs must be added by id strings in the room controller module.
-Sharing minerals between rooms is controlled by the resourcePairs array in the main loop.
-Buying resources is controlled by the buyList array in the market controller
-Lab reactions per room are controlled in the _controlLabs function in the room controller
-The roomLabTypes and roomLabProducts objects in the courier role control what it put into and taken out of labs per room
-The targets array in the ldh role controls remote mining rooms and dropoff points
-The targets array in the reserver role controls which rooms will be reserved to increase the capacity of the sources for ldhs
-If there is a flag called "claim", pioneers will be created to claim and build in that room. They will first go through the portal in the room with a flag named "portal" if it exists.
-The boostRooms array in the upgrader and waller roles controls which rooms are allowed to opportunistically boost those creeps
-If there is a flag with the name "power" warriors will be spawned and will try to harvest a powerbank in the same room as the flag
-Use the parameters in the room controller to specify what room will look for power, when, and where
*/

var creepControl = require('controller.creeps');
var roomControl = require('controller.room');
var trading = require('controller.market');
var find = require('manager.roomInfo');

global.sendEnergyTo = function(targetRoomName) {
    let amount = 0;
    for(const roomName in Game.rooms) {
        const terminal = Game.rooms[roomName].terminal;
        if(roomName != targetRoomName && terminal && terminal.my && terminal.store[RESOURCE_ENERGY] > (TERMINAL_CAPACITY / 30)) {
            if(terminal.send(RESOURCE_ENERGY, Math.floor(terminal.store[RESOURCE_ENERGY] / 2), targetRoomName) == OK) {
                amount += Math.floor(terminal.store[RESOURCE_ENERGY] / 2);
            }
        }
    }
    return amount;
}

var shuffle = function(array) {
    let index = array.length - 1;
    let temp;
    let randI;
    
    while(index > 0) {
        randI = Math.floor(Math.random() * (index + 1));
        
        temp = array[randI];
        array[randI] = array[index];
        array[index] = temp;
        
        index -= 1;
    }
}

var logStuff = function() {
    if(!Memory.stats){ Memory.stats = {}; }
    if(Memory.stats.logTime && Date.now() - Memory.stats.logTime < 55000) {
        return;
    }
    
    Memory.stats.logTime = Date.now();
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
    if(Game.cpu.bucket > 20) {
        creepControl.controlCreeps();
    }
    else {
        console.log("Skipped a creep tick on tick " + Game.time);
    }
    
    roomControl.controlEstablishedRooms();

    if(trading.shouldTrade()) {
        trading.trade();
    }
    
    if(Game.time % 29 == 0 && Game.cpu.bucket > 100) {
        var resourcePairs = [ // destination, resource type, source
            ['E1S7', RESOURCE_OXYGEN, 'E3S4'], ['E3S4', RESOURCE_ZYNTHIUM, 'E7S3'], ['E3S4', RESOURCE_UTRIUM_LEMERGITE, 'W6N17'],
            ['W6N17', RESOURCE_POWER, 'E1S7'], ['E7S3', RESOURCE_POWER, 'E1S7'], ['E3S4', RESOURCE_POWER, 'E1S7'],
            ['E1S7', RESOURCE_LEMERGIUM, 'W6N17'], ['E3S4', RESOURCE_LEMERGIUM_ACID, 'E1S7']
        ];
        
        var sent = {};
        
        shuffle(resourcePairs); // makes distribution more fair
        
        for(var [destRoomName, resource, sourceRoomName] of resourcePairs) {
            var room1 = Game.rooms[sourceRoomName];
            var room2 = Game.rooms[destRoomName];
            var lab = find.getLabWith(room2, resource);
            var amountInRoom = 0;

            if(lab) {
                amountInRoom = lab.mineralAmount;
            }
            
            var resourceRoomIdentifier = resource + "-" + sourceRoomName;
            if(!sent[resourceRoomIdentifier]) {
                sent[resourceRoomIdentifier] = 0;
            }
        
            if(room1.terminal != undefined && room2.terminal != undefined && room1.terminal.store[resource] != undefined && room1.terminal.cooldown == 0) {
                if(room2.terminal.store[resource] != undefined) {
                    amountInRoom += room2.terminal.store[resource];
                }
    
                var amount = Math.min(LAB_MINERAL_CAPACITY - amountInRoom, (room1.terminal.store[resource] - sent[resourceRoomIdentifier]));
                
                if(amount > 500) {
                    room1.terminal.send(resource, amount, room2.name);
                    
                    sent[resourceRoomIdentifier] = sent[resourceRoomIdentifier] + amount;
                }
            }
        }
    }
    
    logStuff();
}
