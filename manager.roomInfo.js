/*
All of the functions in manager.roomInfo will return some list of items in a room, without calculating it an additional time if it has been calculated already during the current game tick.
*/

//var ttlThresh = 40; // depriciated

var _getMyCreeps = function(room){
    if(!room.hasOwnProperty('MY_CREEPS')){
        room.MY_CREEPS = _.filter(Game.creeps, (creep) => {return creep.memory.home == room.controller.id && (creep.spawning || creep.ticksToLive > (creep.body.length * 3));});
    }
    return room.MY_CREEPS;
}

var _getHurtCreeps = function(room){
    if(!room.hasOwnProperty('HURT_CREEPS')){
        room.HURT_CREEPS = _.filter(_getMyCreeps(room), (creep) => {return creep.hits < creep.hitsMax;});
    }
    return room.HURT_CREEPS;
}

var _getHostileCreeps = function(room){
    if(!room.hasOwnProperty('HOSTILE_CREEPS')){      
        room.HOSTILE_CREEPS = room.find(FIND_HOSTILE_CREEPS);
    }
    return room.HOSTILE_CREEPS;
}

var _getStructures = function(room){
    if(!room.hasOwnProperty('STRUCTURES')){
        room.STRUCTURES = room.find(FIND_STRUCTURES);
    }
    return room.STRUCTURES;
}

var _getSpawns = function(room){
    if(!room.hasOwnProperty('SPAWNS')){
        room.SPAWNS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_SPAWN && structure.my);});
    }
    return room.SPAWNS;
}

var _getAvailableSpawns = function(room){
    if(!room.hasOwnProperty('AVAILABLE_SPAWNS')){
        room.AVAILABLE_SPAWNS = _.filter(_getSpawns(room), (spawn) => {return spawn.spawning == null;});
    }
    return room.AVAILABLE_SPAWNS;
}

var _getFillables = function(room){
    if(!room.hasOwnProperty('FILLABLES')){
        room.FILLABLES = _.filter(_getStructures(room), (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    (structure.structureType == STRUCTURE_TOWER && room.energyAvailable > 0.5 * room.energyCapacityAvailable)) &&
                    structure.my &&
                    structure.energy < structure.energyCapacity;
        });
        if(room.FILLABLES.length == 0){
            room.FILLABLES = _.filter(_getStructures(room), (structure) => {
                return (structure.structureType == STRUCTURE_LINK && (structure.energyCapacity - structure.energy) > 1 && structure.my);
            });
            
            if(room.terminal != undefined && room.terminal.store[RESOURCE_ENERGY] < room.terminal.storeCapacity / 15){
                room.FILLABLES.push(room.terminal);
            }
        }
    }
    return room.FILLABLES;
}

var _getExtensions = function(room){
    if(!room.hasOwnProperty('EXTENSIONS')){
        room.EXTENSIONS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_EXTENSION && structure.my)});
    }
    return room.EXTENSIONS;
}

var _getTowers = function(room){
    if(!room.hasOwnProperty('TOWERS')){
        room.TOWERS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_TOWER && structure.my)});
    }
    return room.TOWERS;
}

var _getRoads = function(room){
    if(!room.hasOwnProperty('ROADS')){
        room.ROADS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_ROAD)});
    }
    return room.ROADS;
}

var _getConstructionSites = function(room){
    if(!room.hasOwnProperty('CONSTRUCTION_SITES')){
        room.CONSTRUCTION_SITES = room.find(FIND_CONSTRUCTION_SITES, (site) => {return site.my;});
    }
    return room.CONSTRUCTION_SITES;
}

var _getSources = function(room){
    if(!room.hasOwnProperty('SOURCES')){
        room.SOURCES = room.find(FIND_SOURCES);
    }
    return room.SOURCES;
}

var _getRepairable = function(room){
    if(!room.hasOwnProperty('REPAIRABLE')){
        room.REPAIRABLE = _.filter(_getStructures(room), (structure) => {return (structure.structureType != STRUCTURE_RAMPART && (structure.my || structure.structureType == STRUCTURE_ROAD || structure.structureType == STRUCTURE_CONTAINER) && structure.hits < structure.hitsMax);});
    }
    return room.REPAIRABLE;
}

var _getEmergencyRepairable = function(room){
    if(!room.hasOwnProperty('EMERGENCY_REPAIRABLE')){
        room.EMERGENCY_REPAIRABLE = _.filter(_getRepairable(room).concat(_getRepairableWalls(room)), (structure) => {return (structure.hits < Math.min(0.25 * structure.hitsMax, 10000));});
    }
    return room.EMERGENCY_REPAIRABLE;
}

var _getRepairableWalls = function(room){
    if(!room.hasOwnProperty('R_WALLS')){
        room.R_WALLS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_WALL || (structure.my && structure.structureType == STRUCTURE_RAMPART)) && structure.hits < structure.hitsMax;});
    }
    return room.R_WALLS;
}

var _getGroundEnergy = function(room){
    if(!room.hasOwnProperty('GROUND_ENERGY')){
        room.GROUND_ENERGY = room.find(FIND_DROPPED_RESOURCES, {filter: (resource) => {return resource.resourceType == RESOURCE_ENERGY;}})
    }
    return room.GROUND_ENERGY;
}

var _getContainerEnergy = function(room){
    if(!room.hasOwnProperty('CONTAINER_ENERGY')){
        room.CONTAINER_ENERGY = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0)});
    }
    return room.CONTAINER_ENERGY;
}

var _getClosestStore = function(creep){
    if(creep.room.storage != undefined && creep.room.storage.store[RESOURCE_ENERGY] > 0){
        return creep.room.storage;
    }
    else {
        return creep.pos.findClosestByRange(_getContainerEnergy(creep.room));
    }
}

var _getHarvesters = function(room){
    if(!room.hasOwnProperty('HARVESTERS')){
        room.HARVESTERS = _.filter(_getMyCreeps(room), (creep) => {
            var walkTime = 0;
            if(creep.memory.role == 'harvester'){
                walkTime = (creep.body.length * 3) + (creep.pos.findPathTo(creep.pos.findClosestByRange(_getSpawns(room))).length * 2.5);
                //console.log("Creep " + creep.name + " has a walkTime of " + walkTime);
            }
            return (creep.memory.role == 'harvester') && (creep.spawning || creep.ticksToLive > walkTime);
        });
    }
    return room.HARVESTERS;
}

var _getCouriers = function(room){
    if(!room.hasOwnProperty('COURIERS')){
        room.COURIERS = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'courier')});
    }
    return room.COURIERS;
}

var _getHandymen = function(room){
    if(!room.hasOwnProperty('HANDYMEN')){
        room.HANDYMEN = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'handyman')});
    }
    return room.HANDYMEN;
}

var _getWallers = function(room){
    if(!room.hasOwnProperty('WALLERS')){
        room.WALLERS = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'waller')});
    }
    return room.WALLERS;
}

var _getMiners = function(room){
    if(!room.hasOwnProperty('MINERS')){
        room.MINERS = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'miner')});
    }
    return room.MINERS;
}

var _getUpgraders = function(room){
    if(!room.hasOwnProperty('UPGRADERS')){
        room.UPGRADERS = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'upgrader')});
    }
    return room.UPGRADERS;
}

var _getWarriors = function(room){
    if(!room.hasOwnProperty('WARRIORS')){
        room.WARRIORS = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'warrior')});
    }
    return room.WARRIORS;
}

var _getHealers = function(room){
    if(!room.hasOwnProperty('HEALERS')){
        room.HEALERS = _.filter(_getMyCreeps(room), (creep) => {return (creep.memory.role == 'healer')});
    }
    return room.HEALERS;
}

var _getClaimers = function(room){
    if(!Game.hasOwnProperty('CLAIMERS')){
        Game.CLAIMERS = _.filter(Game.creeps, (creep) => {return (creep.memory.role == 'claimer') && (creep.spawning || creep.ticksToLive > (creep.body.length * 3));});
    }
    return Game.CLAIMERS;
}

var _getRaiders = function(room){
    if(!Game.hasOwnProperty('RAIDERS')){
        Game.RAIDERS = _.filter(Game.creeps, (creep) => {return (creep.memory.role == 'raider') && (creep.spawning || creep.ticksToLive > (creep.body.length * 3));});
    }
    return Game.RAIDERS;
}

var _getMineral = function(room){
    if(!room.hasOwnProperty('MINERAL')){
        var minerals = room.find(FIND_MINERALS);
        if(minerals.length > 0){
            room.MINERAL = minerals[0];
        }
        else {
            room.MINERAL = undefined;
        }
    }
    return room.MINERAL;
}

var _getExtractors = function(room){
    if(!room.hasOwnProperty('EXTRACTORS')){
        room.EXTRACTORS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_EXTRACTOR && structure.my)});
    }
    return room.EXTRACTORS;
}

var _getCreepLink = function(creep){
    if(!creep.hasOwnProperty('LINK')){
        var links = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: (structure) => {return structure.structureType == STRUCTURE_LINK;}});
        if(links.length > 0){
            creep.LINK = links[0];
        }
        else{
            creep.LINK = undefined;
        }
    }
    return creep.LINK;
}

var _isOpen = function(source, thisCreep){
    var x = source.pos.x;
    var y = source.pos.y;
    var r = 1;
    var y1 = y-r;
    if(y1 < 0){y1 = 0;}
    var x1 = x-r;
    if(x1 < 0){x1 = 0;}
    var y2 = y+r;
    if(y2 > 49){y2 = 49;}
    var x2 = x+r;
    if(x2 > 49){x2 = 49;}

    var list = source.room.lookAtArea(y1,x1,y2,x2,false);
    for(let ys in list){
        for(let xs in list[ys]){
            let terra = false;
            let creep = false;
            for(let i in list[ys][xs]){
                if(list[ys][xs][i].type == 'creep' && list[ys][xs][i].creep != thisCreep){
                    creep = true;
                }
                if(list[ys][xs][i].type == 'terrain' && list[ys][xs][i].terrain != 'wall'){
                    terra = true;
                }
            }
            if(terra && !creep){
                return true;
            }
        }
    }
    return false;
}

var _canBuild = function(room, x, y){
    if(x < 0 || x > 49 || y < 0 || y > 49){
        return false;
    }

    var things = room.lookAt(x,y);
    for(let i in things){
        if(things[i].type == 'constructionSite' || things[i].type == 'structure' || (things[i].type == 'terrain' && things[i].terrain == 'wall')){
            return false;
        }
    }
    return true;
}

var _getPortals = function(room){
    if(!room.hasOwnProperty('PORTALS')){
        room.PORTALS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_PORTAL)});
    }
    return room.PORTALS;
}

module.exports = {
    getMyCreeps: _getMyCreeps,
    getHostileCreeps: _getHostileCreeps,
    getStructures: _getStructures,
    getSpawns: _getSpawns,
    getAvailableSpawns: _getAvailableSpawns,
    getFillables: _getFillables,
    getExtensions: _getExtensions,
    getRoads: _getRoads,
    getConstructionSites: _getConstructionSites,
    getSources: _getSources,
    getRepairable: _getRepairable,
    getGroundEnergy: _getGroundEnergy,
    getContainerEnergy: _getContainerEnergy,
    getClosestStore: _getClosestStore,
    isOpen: _isOpen,
    getHarvesters: _getHarvesters,
    getEmergencyRepairable: _getEmergencyRepairable,
    getMineral: _getMineral,
    getTowers: _getTowers,
    getCouriers: _getCouriers,
    getClaimers: _getClaimers,
    getHandymen: _getHandymen,
    getMiners: _getMiners,
    getUpgraders: _getUpgraders,
    getWarriors: _getWarriors,
    canBuild: _canBuild,
    getExtractors: _getExtractors,
    getRaiders: _getRaiders,
    getCreepLink: _getCreepLink,
    getRepairableWalls: _getRepairableWalls,
    getWallers: _getWallers,
    getHurtCreeps: _getHurtCreeps,
    getHealers: _getHealers,
    getPortals: _getPortals
};