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
    warrior: require('role.warrior'), 
    healer: require('role.healer'),
    upgrader: require('role.upgrader'),
    waller: require('role.waller'),
    miner: require('role.miner'),
    claimer: require('role.claimer'),
    raider: require('role.raider')
};

//* For the official server: (remove one slash to disable)
var linkPairs = [
    {link1_id: '5866982e4eec9a356698f2c3', link2_id: '58669fed583c71734b9091e6'},
    {link1_id: '587948c207d95f7d3e4ddab7', link2_id: '5879658852d6c26c1bd4d4e9'}
];
//*/
/* For my server: (add one slash to enable)
var linkPairs = [
    //nada
];
//*/
// ***** End *****

var _controlEstablishedRooms = function(){
    var myRooms = [];
    for(let i in Game.spawns){
        let thisRoom = Game.spawns[i].room;
        if(myRooms.indexOf(thisRoom) < 0){
            myRooms.push(thisRoom);
        }
    }

    for(let i in myRooms){
        _controlRoom(myRooms[i]);
    }

    _operateLinks();
}

var _controlRoom = function(room){
    _spawnCreeps(room);
    _controlTowers(room);
    _buildSomething(room);
}

// *** Spawning ***
var _spawnCreeps = function(room){
    var spawns = find.getAvailableSpawns(room);
    if(spawns.length == 0){ // Can't make things with no spawn!
        return;
    }
    else if(find.getHandymen(room).length == 0 && (find.getCouriers(room).length == 0 || find.getHarvesters(room).length == 0)){ // Emergency spawning
        creepLimits.handyman.lib.make(spawns[0], room.energyAvailable);
    }
    else { // regular spawning
        var energyMax = room.energyCapacityAvailable;
        for(let i in spawns){
            _spawnSingleCreep(spawns[i], room.energyCapacityAvailable);
        }
    }
}

var _spawnSingleCreep = function(spawn, energy_limit){
    for(let name in creepLimits){
        if(creepLimits[name].shouldMake(spawn.room)){
            //console.log('Making a ' + name + ' in room ' + spawn.room.name + '.');
            let retVal = creepLimits[name].make(spawn, energy_limit);
            if(retVal != 0){
                return retVal;
            }
        }
    }
    return 0;
}
// *** End ***

// *** Towers ***
var _controlTowers = function(room){
    tower = find.getTowers(room);
    for(let i in tower){
        _operateTower(tower[i]);
    }
}

var _operateTower = function(tower){
    var closestHostile = tower.pos.findClosestByRange(find.getHostileCreeps(tower.room), {filter: (creep) => {
        return creep.getActiveBodyparts(ATTACK) > 0 || creep.getActiveBodyparts(RANGED_ATTACK) > 0  || creep.getActiveBodyparts(HEAL) > 0;
    }});
    
    if(closestHostile){
        tower.attack(closestHostile);
        return;
    }

    var closestHurt = tower.pos.findClosestByRange(find.getMyCreeps(tower.room), {filter: (creep) => {
        return (creep.hits < creep.hitsMax);
    }});
    if(closestHurt){
        tower.heal(closestHurt);
        return;
    }

    var closestEmergency = tower.pos.findClosestByRange(find.getEmergencyRepairable(tower.room));
    if(closestEmergency){
        tower.repair(closestEmergency);
        return;
    }
}
// *** End ***

// *** Building ***
var _buildSomething = function(room){
    if(find.getConstructionSites(room).length > 0){ // we like only one construction site at a time.
        return;
    }
    else if(find.getExtractors(room).length < CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level]){
        _buildExtractor(room);
    }
    else if(find.getExtensions(room).length < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]){
        _buildExtension(room);
    }

}

var _buildExtension = function(room){
    var flags = room.find(FIND_FLAGS, {filter: (flag) => {
        return (flag.color == COLOR_WHITE && flag.secondaryColor == COLOR_YELLOW);
    }});
        
    if(flags.length){
        var flag = flags[0];
        var dx = 0;
        var dy = 0;
        var r = 0;
        while(!find.canBuild(room, flag.pos.x + dx, flag.pos.y + dy)){
            if(dx == -r && dy == r){
                dx += 1;
                dy += 1;
                r += 1;
            }
            else if(dx == -r){
                dy += 2;
            }
            else if(dy == -r){
                dx -= 2;
            }
            else if(dx == r){
                dy -= 2;
            }
            else if(dy == r){
                dx += 2;
            }
        }
        room.createConstructionSite(flag.pos.x + dx, flag.pos.y + dy, STRUCTURE_EXTENSION);
    }
}

var _buildExtractor = function(room){
    room.createConstructionSite(find.getMineral(room).pos, STRUCTURE_EXTRACTOR);
}
// *** End ***

// *** Links ***
var _operateLinks = function(){
    for(let i in linkPairs){
        _operateLinkPair(linkPairs[i].link1_id, linkPairs[i].link2_id);
    }
}

var _operateLinkPair = function(link1_id, link2_id){
    var link1 = Game.getObjectById(link1_id);
    var link2 = Game.getObjectById(link2_id);
    if(link1 != undefined && link2 != undefined && link1.cooldown == 0 && link1.energy > 0 && (link2.energyCapacity - link2.energy) > 1){
        link1.transferEnergy(link2);
    }
}
// *** End ***

module.exports = {
    controlEstablishedRooms: _controlEstablishedRooms
};