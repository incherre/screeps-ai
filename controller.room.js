/*
This is the module that controls room things, like making new creeps and building things.
TODO:
-Automate more construction
-Deal with claimed rooms that have no spawn
*/

var find = require('manager.roomInfo');

// ***** Options *****
var creepLimits = {
    handyman: require('role.handyman'),
    courier: require('role.courier'),
    harvester: require('role.harvester'),
    upgrader: require('role.upgrader'),
    waller: require('role.waller'),
    miner: require('role.miner'),
    protector: require('role.protector'),
    healer: require('role.healer'),
    ldh: require('role.ldh'),
    reserver: require('role.reserver'),
    pioneer: require('role.pioneer'),
    warrior: require('role.warrior'), 
};

//* For the official server: (remove one slash to disable)
var linkPairs = [
    {link1_id: '5bc03a90eeb4b90a618557c5', link2_id: '5bc03cd6c02fde0a5b926e1e'},
    {link1_id: '5bc58fe60956ad24cdead381', link2_id: '5bc5920666205024dfb33ece'},
    {link1_id: '5bd322ff5dafd63c259d0bf2', link2_id: '5bd32472f339b225424e7bf5'}
];
//*/
/* For my server: (add one slash to enable)
var linkPairs = [
    //nada
];
//*/

const powerRoomName = 'E1S7';
const powerMinThreshold = 20000;
const powerTimes = [13, 3]; // [start, end], range in hours, UTC
const powerCheckingRooms = ['E0S6', 'E0S7', 'W0S6', 'E0S5', 'W0S7', 'W0S5', 'E0S8', 'W0S8'];
const powerFlag = 'power';
const harvestAutomatically = true;
// ***** End *****

var _controlEstablishedRooms = function() {
    var myRooms = [];
    for(let i in Game.spawns) {
        let thisRoom = Game.spawns[i].room;
        if(myRooms.indexOf(thisRoom) < 0) {
            myRooms.push(thisRoom);
        }
    }

    for(let i in myRooms) {
        _controlRoom(myRooms[i]);
    }

    _operateLinks();
}

var _controlRoom = function(room) {
    _spawnCreeps(room);
    _controlTowers(room);
    
    if(find.getTowers(room).length == 0 && !room.controller.safeMode && room.controller.safeModeAvailable > 0 && !room.controller.safeModeCooldown) {
        var enemies = find.getHostileCreeps(room);
        if(enemies.length > 0) {
            room.controller.activateSafeMode();
            Game.notify("Activated Safe Mode in new room " + room.name, 10);
        }
    }
    
    _buildSomething(room);
    
    if(Game.time % 5 == 0) {
        _controlLabs(room);
    }
    
    if(Game.time % 151 == 0) {
        var nukes = room.find(FIND_NUKES);
        if(!room.memory.nukeNotified && nukes.length > 0) {
            Game.notify("Incoming nuke/s detected in room " + room.name, 10);
            room.memory.nukeNotified = true;
        }
        else if(room.memory.nukeNotified && nukes.length == 0) {
            room.memory.nukeNotified = false;
        }
    }
    
    var powerSpawn = find.getPowerSpawn(room);
    if(powerSpawn && powerSpawn.energy > POWER_SPAWN_ENERGY_RATIO && powerSpawn.power > 0 && room.storage && room.storage.store[RESOURCE_ENERGY] > (STORAGE_CAPACITY * 0.3)) {
        powerSpawn.processPower();
    }
    
    _lookForPower(room);
}

var _lookForPower = function(room) {
    if(room.name != powerRoomName || !room.storage || powerCheckingRooms.length == 0 || powerTimes.length != 2) {
        return;
    }
    
    if(Game.flags.hasOwnProperty(powerFlag)) {
        if(Memory.powerNotified) {
            Memory.powerNotified = false;
        }
        const flag = Game.flags[powerFlag];
        const observer = find.getObserver(room);
        if(flag.room) {
            // check if it's over
            const structures = flag.room.lookForAt(LOOK_STRUCTURES, flag);
            const resources = flag.room.lookForAt(LOOK_RESOURCES, flag);
            if(structures.length == 0 && resources.length == 0) {
                flag.remove();
            }
        }
        else if(observer) {
            // get vision
            observer.observeRoom(flag.pos.roomName);
        }
        return;
    }
    
    if(Game.time % 150 > powerCheckingRooms.length) {
        // only check every 150 ticks
        return;
    }
    
    const now = (new Date()).getUTCHours();
    const inTimeRange = (powerTimes[0] < powerTimes[1]) ? (now >= powerTimes[0] && now <= powerTimes[1]) : (now >= powerTimes[0] || now <= powerTimes[1]);
    const observer = find.getObserver(room);
    if((!inTimeRange && !harvestAutomatically) || !observer || (room.storage.store[RESOURCE_POWER] && room.storage.store[RESOURCE_POWER] > powerMinThreshold)) {
        return;
    }

    let lookRoom = null;
    for(let i = 0; i < powerCheckingRooms.length; i++) {
        if(Game.rooms[powerCheckingRooms[i]]) {
            lookRoom = Game.rooms[powerCheckingRooms[i]];
            observer.observeRoom(powerCheckingRooms[(i + 1) % powerCheckingRooms.length]);
        }
    }
    
    if(!lookRoom) {
        observer.observeRoom(powerCheckingRooms[0]);
        return;
    }
    
    const powerBanks = lookRoom.find(FIND_STRUCTURES, {filter: (struct) => {return struct.structureType == STRUCTURE_POWER_BANK;}});
    for(const powerBank of powerBanks) {
        let freeSpaceCount = 0;
        const terrain = lookRoom.getTerrain();
        for(let dx = -1; dx <= 1; dx++) {
            for(let dy = -1; dy <= 1; dy++) {
                if((dx != 0 || dy != 0) && terrain.get(powerBank.pos.x + dx, powerBank.pos.y + dy) != TERRAIN_MASK_WALL) {
                    freeSpaceCount++;
                }
            }
        }
        
        let powerThreshold = 2400;
        if(room.storage.store[RESOURCE_POWER] > powerThreshold * 2) {
            powerThreshold = Math.floor(room.storage.store[RESOURCE_POWER] / 2);
        }
        
        if(powerBank.ticksToDecay > 4500 && powerBank.power > powerThreshold && freeSpaceCount >= 4) {
            console.log("Power bank with " + powerBank.power + " power found in " + lookRoom.name);

            if(!Memory.powerNotified && !harvestAutomatically) {
                Game.notify("Good power bank found in " + lookRoom.name + " at " + Game.time);
                Memory.powerNotified = true;
            }
            
            if(harvestAutomatically && Game.cpu.bucket >= 8500 && room.storage.store[RESOURCE_ENERGY] > STORAGE_CAPACITY * 0.25) {
                powerBank.pos.createFlag(powerFlag, COLOR_RED);
            }
        }
    }
}

// *** Spawning ***
var _spawnCreeps = function(room) {
    var spawns = find.getAvailableSpawns(room);
    if(spawns.length == 0) { // Can't make things with no spawn!
        return;
    }
    else if(find.getRole(room, 'handyman').length == 0 && (find.getRole(room, 'courier').length == 0 || find.getRole(room, 'harvester').length == 0) && (creepLimits.pioneer.target != room.name || find.getRole(room, 'pioneer').length == 0)) { // Emergency spawning
        console.log("Emergency spawning in room " + room.name);
        creepLimits.handyman.make(spawns[0], room.energyAvailable);
    }
    else { // regular spawning
        var energyMax = room.energyCapacityAvailable;
        _spawnSingleCreep(spawns[0], energyMax); // only *start* spawing one creep per room per tick
    }
}

var _spawnSingleCreep = function(spawn, energy_limit) {
    for(let name in creepLimits) {
        if(creepLimits[name].shouldMake(spawn.room)){
            let retVal = creepLimits[name].make(spawn, energy_limit);
            if(retVal != 0) {
                return retVal;
            }
        }
    }
    return 0;
}
// *** End ***

// *** Labs ***
var _runReaction = function(mineralLabs, type1, type2) {
    let source1 = null;
    let source2 = null;
    let sinkType = null;
    let sink = null;
    
    if(REACTIONS[type1] && REACTIONS[type1][type2]) {
        sinkType = REACTIONS[type1][type2];
    }
    else {
        return;
    }
    
    if(mineralLabs.hasOwnProperty(type1)) {
        for(let i in mineralLabs[type1]) {
            let lab = mineralLabs[type1][i];
            if(lab.mineralAmount > LAB_REACTION_AMOUNT) {
                source1 = lab;
                break;
            }
        }
    }
    
    if(source1 && mineralLabs.hasOwnProperty(type2)) {
        for(let i in mineralLabs[type2]) {
            let lab = mineralLabs[type2][i];
            if(lab.mineralAmount > LAB_REACTION_AMOUNT) {
                source2 = lab;
                break;
            }
        }
    }
    
    if(source2 && mineralLabs.hasOwnProperty(sinkType)) {
        for(let i in mineralLabs[sinkType]) {
            let lab = mineralLabs[sinkType][i];
            if(lab.mineralCapacity - lab.mineralAmount >= LAB_REACTION_AMOUNT && lab.cooldown == 0) {
                sink = lab;
                break;
            }
        }
    }
    
    if(source2 && !mineralLabs.hasOwnProperty(sinkType) && mineralLabs.hasOwnProperty('none')) {
        for(let i in mineralLabs['none']) {
            let lab = mineralLabs['none'][i];
            if(lab.mineralCapacity - lab.mineralAmount >= LAB_REACTION_AMOUNT && lab.cooldown == 0) {
                sink = lab;
                break;
            }
        }
    }
    
    if(source1 && source2 && sink) {
        sink.runReaction(source1, source2);
    }
    
}

var _controlLabs = function(room) {
    let labs = find.getLabs(room);
    const MINERAL_EMPTY = 'none';

    let minerals = {};
    for(let i in labs) {
        let mineralType;
        if(labs[i].mineralType == null){
            mineralType = MINERAL_EMPTY;
        }
        else {
            mineralType = labs[i].mineralType;
        }
        
        if(!minerals.hasOwnProperty(mineralType)) {
            minerals[mineralType] = [];
        }
        
        minerals[mineralType].push(labs[i]);
    }
    
    if(room.name == 'W6N17' && room.terminal && (!room.terminal.store[RESOURCE_UTRIUM_LEMERGITE] || room.terminal.store[RESOURCE_UTRIUM_LEMERGITE] < 3000)) {
        _runReaction(minerals, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM);
    }
    
    if(room.name == 'E3S4') {
        _runReaction(minerals, RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM);
        _runReaction(minerals, RESOURCE_UTRIUM_LEMERGITE, RESOURCE_ZYNTHIUM_KEANITE);
    }
    
    if(room.name == 'E1S7') {
        _runReaction(minerals, RESOURCE_HYDROGEN, RESOURCE_GHODIUM);
        _runReaction(minerals, RESOURCE_HYDROXIDE, RESOURCE_GHODIUM_HYDRIDE);
        _runReaction(minerals, RESOURCE_HYDROGEN, RESOURCE_OXYGEN);
    }
}
// *** End ***

// *** Towers ***
var _controlTowers = function(room) {
    var tower = find.getTowers(room);
    for(let i in tower) {
        _operateTower(tower[i]);
    }
}

var _operateTower = function(tower){
    var closestHostile = tower.pos.findClosestByRange(find.getHostileCreeps(tower.room));
    
    if(closestHostile) {
        tower.attack(closestHostile);
        if(tower.energy < 0.4 * tower.energyCapacity) {
            if(!Memory.PROTECTOR_REQUESTS) {
                Memory.PROTECTOR_REQUESTS = [];
            }
            
            if(Memory.PROTECTOR_REQUESTS.indexOf(tower.room.name) == -1) {
                Memory.PROTECTOR_REQUESTS.unshift(tower.room.name);
            }
        }
        return;
    }

    var closestHurt = tower.pos.findClosestByRange(find.getHurtCreeps(tower.room));
    if(closestHurt) {
        tower.heal(closestHurt);
        return;
    }

    var closestEmergency = tower.pos.findClosestByRange(find.getEmergencyRepairable(tower.room));
    if(closestEmergency) {
        tower.repair(closestEmergency);
        return;
    }
    
    closestHostile = tower.pos.findClosestByRange(tower.room.find(FIND_HOSTILE_CREEPS));
    if(closestHostile) {
        tower.attack(closestHostile);
    }
}
// *** End ***

// *** Building ***
var _buildSomething = function(room) {
    if(find.getConstructionSites(room).length > 0) { // we like only one construction site at a time.
        return;
    }
    else if(find.getExtractors(room).length < CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level]) {
        _buildExtractor(room);
    }
    else if(find.getExtensions(room).length < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
        _buildExtension(room);
    }

}

var _buildExtension = function(room) {
    var flags = room.find(FIND_FLAGS, {filter: (flag) => {
        return (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_YELLOW);
    }});
        
    if(flags.length) {
        var flag = flags[0];
        var dx = 0;
        var dy = 0;
        var r = 0;
        while(!find.canBuild(room, flag.pos.x + dx, flag.pos.y + dy)) {
            if(dx == -r && dy == r) {
                dx += 1;
                dy += 1;
                r += 1;
            }
            else if(dx == -r) {
                dy += 2;
            }
            else if(dy == -r) {
                dx -= 2;
            }
            else if(dx == r) {
                dy -= 2;
            }
            else if(dy == r) {
                dx += 2;
            }
        }
        room.createConstructionSite(flag.pos.x + dx, flag.pos.y + dy, STRUCTURE_EXTENSION);
    }
}

var _buildExtractor = function(room) {
    room.createConstructionSite(find.getMineral(room).pos, STRUCTURE_EXTRACTOR);
}
// *** End ***

// *** Links ***
var _operateLinks = function() {
    for(let i in linkPairs) {
        _operateLinkPair(linkPairs[i].link1_id, linkPairs[i].link2_id);
    }
}

var _operateLinkPair = function(link1_id, link2_id) {
    var link1 = Game.getObjectById(link1_id);
    var link2 = Game.getObjectById(link2_id);
    if(link1 != undefined && link2 != undefined && link1.cooldown == 0 && link1.energy > 0 && (link2.energyCapacity - link2.energy) > 1) {
        link1.transferEnergy(link2);
    }
}
// *** End ***

module.exports = {
    controlEstablishedRooms: _controlEstablishedRooms
};
