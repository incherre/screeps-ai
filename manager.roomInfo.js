/*
All of the functions in manager.roomInfo will return some list of items in a room, without calculating it an additional time if it has been calculated already during the current game tick.
*/

var _creepNames = ['Sylvia', 'Persephone', "Sophia", "Emma", "Olivia", "Isabella", "Mia", "Ava", "Lily", "Zoe", "Emily", "Chloe", "Layla", "Madison", "Madelyn", "Abigail", "Aubrey", "Charlotte", "Amelia", "Ella", "Kaylee", "Avery", "Aaliyah", "Hailey", "Hannah", "Addison", "Riley", "Harper", "Aria", "Arianna", "Mackenzie", "Lila", "Evelyn", "Adalyn", "Grace", "Brooklyn", "Ellie", "Anna", "Kaitlyn", "Isabelle", "Sophie", "Scarlett", "Natalie", "Leah", "Sarah", "Nora", "Mila", "Elizabeth", "Lillian", "Kylie", "Audrey", "Lucy", "Maya", "Annabelle", "Makayla", "Gabriella", "Elena", "Victoria", "Claire", "Savannah", "Peyton", "Maria", "Alaina", "Kennedy", "Stella", "Liliana", "Allison", "Samantha", "Keira", "Alyssa", "Reagan", "Molly", "Alexandra", "Violet", "Charlie", "Julia", "Sadie", "Ruby", "Eva", "Alice", "Eliana", "Taylor", "Callie", "Penelope", "Camilla", "Bailey", "Kaelyn", "Alexis", "Kayla", "Katherine", "Sydney", "Lauren", "Jasmine", "London", "Bella", "Adeline", "Caroline", "Vivian", "Juliana", "Gianna", "Skyler", "Jordyn"];

var _getMyCreeps = function(room) {
    return _getRole(room, 'all');
}

var _getHurtCreeps = function(room) {
    if(!room.hasOwnProperty('HURT_CREEPS')) {
        room.HURT_CREEPS = _.filter(_getMyCreeps(room), (creep) => {return creep.hits < creep.hitsMax;});
    }
    return room.HURT_CREEPS;
}

var _getHostileCreeps = function(room) {
    if(!room.hasOwnProperty('HOSTILE_CREEPS')) {      
        room.HOSTILE_CREEPS = room.find(FIND_HOSTILE_CREEPS);
    }
    return room.HOSTILE_CREEPS;
}

// creep sorting code start
var _creepFilter = {
    'harvester': {roomSpecific: true, valid: (creep) => {return (creep.spawning || creep.ticksToLive > (creep.pos.findPathTo(creep.pos.findClosestByRange(_getSpawns(creep.room))).length * 2.5));}},
    'courier': {roomSpecific: true, valid: (creep) => {return true;}},
    'handyman': {roomSpecific: true, valid: (creep) => {return true;}},
    'waller': {roomSpecific: true, valid: (creep) => {return true;}},
    'miner': {roomSpecific: true, valid: (creep) => {return true;}},
    'upgrader': {roomSpecific: true, valid: (creep) => {return true;}},
    'warrior': {roomSpecific: true, valid: (creep) => {return true;}},
    'healer': {roomSpecific: true, valid: (creep) => {return true;}},
    'claimer': {roomSpecific: false, valid: (creep) => {return true;}},
    'protector': {roomSpecific: false, valid: (creep) => {return true;}},
    'ldh': {roomSpecific: false, valid: (creep) => {return true;}},
    'reserver': {roomSpecific: false, valid: (creep) => {return true;}},
    'pioneer': {roomSpecific: false, valid: (creep) => {return true;}}
}

var _populateRoles = function() {
    if(!Game.hasOwnProperty('CREEP_TYPES')) {
        Game.CREEP_TYPES = {'all': {'all': []}};
        for(let name in Game.creeps) {
            let creep = Game.creeps[name];
            if(creep.memory.hasOwnProperty('role') && _creepFilter.hasOwnProperty(creep.memory.role)) {
                let filter = _creepFilter[creep.memory.role];
                if((creep.spawning || creep.ticksToLive > (creep.body.length * 3)) && filter.valid(creep)) {
                    if(filter.roomSpecific) {
                        if(!Game.CREEP_TYPES.hasOwnProperty(creep.memory.home)) {
                            Game.CREEP_TYPES[creep.memory.home] = {'all': []};
                        }
                        if(!Game.CREEP_TYPES[creep.memory.home].hasOwnProperty(creep.memory.role)) {
                            Game.CREEP_TYPES[creep.memory.home][creep.memory.role] = [];
                        }
                        
                        Game.CREEP_TYPES[creep.memory.home][creep.memory.role].push(creep);
                        Game.CREEP_TYPES[creep.memory.home].all.push(creep);
                    }
                    else {
                        if(!Game.CREEP_TYPES.all.hasOwnProperty(creep.memory.role)) {
                            Game.CREEP_TYPES.all[creep.memory.role] = [];
                        }
                        
                        Game.CREEP_TYPES.all[creep.memory.role].push(creep);
                        Game.CREEP_TYPES.all.all.push(creep);
                    }
                }
            }
            else {
                console.log('creep ' + name + ' has missing or unknown role');
            }
        }
    }
}

var _getRole = function(room, role) {
    _populateRoles();
    
    var roomCode;
    if(role != 'all' && _creepFilter[role].roomSpecific) {
        roomCode = room.controller.id;
    }
    else {
        roomCode = 'all';
    }

    if(Game.CREEP_TYPES.hasOwnProperty(roomCode) && Game.CREEP_TYPES[roomCode].hasOwnProperty(role)) {
        return  Game.CREEP_TYPES[roomCode][role];
    }
    else {
        return [];
    }
}

var _addRole = function(creep, role) {
    _populateRoles();
    
    var roomCode;
    if(_creepFilter[role].roomSpecific) {
        roomCode = creep.memory.home;
    }
    else {
        roomCode = 'all';
    }
    
    if(!Game.CREEP_TYPES.hasOwnProperty(roomCode)) {
        Game.CREEP_TYPES[roomCode] = {'all': []};
    }
    if(!Game.CREEP_TYPES[roomCode].hasOwnProperty(creep.memory.role)) {
        Game.CREEP_TYPES[roomCode][creep.memory.role] = [];
    }
    
    Game.CREEP_TYPES[roomCode][creep.memory.role].push(creep);
    Game.CREEP_TYPES[roomCode].all.push(creep);
}
// creep sorting code end

var _getStructures = function(room) {
    if(!room.hasOwnProperty('STRUCTURES')) {
        room.STRUCTURES = room.find(FIND_STRUCTURES);
    }
    return room.STRUCTURES;
}

var _getSpawns = function(room) {
    if(!room.hasOwnProperty('SPAWNS')) {
        room.SPAWNS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_SPAWN && structure.my);});
    }
    return room.SPAWNS;
}

var _getAvailableSpawns = function(room) {
    if(!room.hasOwnProperty('AVAILABLE_SPAWNS')) {
        room.AVAILABLE_SPAWNS = _.filter(_getSpawns(room), (spawn) => {return spawn.spawning == null;});
    }
    return room.AVAILABLE_SPAWNS;
}

var _getFillables = function(room) {
    if(!room.hasOwnProperty('FILLABLES')) {
        room.FILLABLES = _.filter(_getStructures(room), (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    (structure.structureType == STRUCTURE_TOWER && room.energyAvailable > 0.5 * room.energyCapacityAvailable)) &&
                    structure.my &&
                    structure.energy < structure.energyCapacity;
        });
        if(room.FILLABLES.length == 0) {
            room.FILLABLES = _.filter(_getStructures(room), (structure) => {
                return (structure.structureType == STRUCTURE_LINK && (structure.energyCapacity - structure.energy) > 1 && structure.my);
            });
            
            if(room.terminal != undefined && room.terminal.store[RESOURCE_ENERGY] < room.terminal.storeCapacity / 15) {
                room.FILLABLES.push(room.terminal);
            }
        }
    }
    return room.FILLABLES;
}

var _getExtensions = function(room) {
    if(!room.hasOwnProperty('EXTENSIONS')) {
        room.EXTENSIONS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_EXTENSION && structure.my)});
    }
    return room.EXTENSIONS;
}

var _getTowers = function(room) {
    if(!room.hasOwnProperty('TOWERS')) {
        room.TOWERS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_TOWER && structure.my)});
    }
    return room.TOWERS;
}

var _getRoads = function(room) {
    if(!room.hasOwnProperty('ROADS')) {
        room.ROADS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_ROAD)});
    }
    return room.ROADS;
}

var _getConstructionSites = function(room) {
    if(!room.hasOwnProperty('CONSTRUCTION_SITES')) {
        room.CONSTRUCTION_SITES = room.find(FIND_CONSTRUCTION_SITES, {filter: (site) => {return site.my;}});
    }
    return room.CONSTRUCTION_SITES;
}

var _getSources = function(room) {
    if(!room.hasOwnProperty('SOURCES')) {
        room.SOURCES = room.find(FIND_SOURCES);
    }
    return room.SOURCES;
}

var _getRepairable = function(room) {
    if(!room.hasOwnProperty('REPAIRABLE')) {
        room.REPAIRABLE = _.filter(_getStructures(room), (structure) => {return (structure.structureType != STRUCTURE_RAMPART && (structure.my || structure.structureType == STRUCTURE_ROAD || structure.structureType == STRUCTURE_CONTAINER) && structure.hits < structure.hitsMax);});
    }
    return room.REPAIRABLE;
}

var _getEmergencyRepairable = function(room) {
    if(!room.hasOwnProperty('EMERGENCY_REPAIRABLE')) {
        room.EMERGENCY_REPAIRABLE = _.filter(_getRepairable(room).concat(_getRepairableWalls(room)), (structure) => {return (structure.hits < Math.min(0.25 * structure.hitsMax, 10000));});
    }
    return room.EMERGENCY_REPAIRABLE;
}

var _getRepairableWalls = function(room) {
    if(!room.hasOwnProperty('R_WALLS')) {
        room.R_WALLS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_WALL || (structure.my && structure.structureType == STRUCTURE_RAMPART)) && structure.hits < structure.hitsMax;});
    }
    return room.R_WALLS;
}

var _getGroundEnergy = function(room) {
    if(!room.hasOwnProperty('GROUND_ENERGY')) {
        room.GROUND_ENERGY = room.find(FIND_DROPPED_RESOURCES, {filter: (resource) => {return resource.resourceType == RESOURCE_ENERGY;}})
    }
    return room.GROUND_ENERGY;
}

var _getGroundMinerals = function(room) {
    if(!room.hasOwnProperty('GROUND_MINERALS')) {
        room.GROUND_MINERALS = room.find(FIND_DROPPED_RESOURCES, {filter: (resource) => {return resource.resourceType != RESOURCE_ENERGY;}})
    }
    return room.GROUND_MINERALS;
}

var _getTombstoneMinerals = function(room) {
    if(!room.hasOwnProperty('TOMBSTONE_MINERALS')) {
        room.TOMBSTONE_MINERALS = room.find(FIND_TOMBSTONES, {filter: (stone) => {return Object.keys(stone.store).length > 1;}})
    }
    return room.TOMBSTONE_MINERALS;
}

var _getContainerEnergy = function(room) {
    if(!room.hasOwnProperty('CONTAINER_ENERGY')) {
        room.CONTAINER_ENERGY = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0)});
        room.CONTAINER_ENERGY = room.CONTAINER_ENERGY.concat(room.find(FIND_TOMBSTONES, {filter: (stone) => {return stone.store[RESOURCE_ENERGY] > 0;}}));        
    }
    return room.CONTAINER_ENERGY;
}

var _getClosestStore = function(creep) {
    if(creep.room.storage != undefined && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
        return creep.room.storage;
    }
    else {
        return creep.pos.findClosestByRange(_getContainerEnergy(creep.room));
    }
}

var _getMineral = function(room) {
    if(!room.hasOwnProperty('MINERAL')) {
        var minerals = room.find(FIND_MINERALS);
        if(minerals.length > 0) {
            room.MINERAL = minerals[0];
        }
        else {
            room.MINERAL = undefined;
        }
    }
    return room.MINERAL;
}

var _getExtractors = function(room) {
    if(!room.hasOwnProperty('EXTRACTORS')) {
        room.EXTRACTORS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_EXTRACTOR && structure.my)});
    }
    return room.EXTRACTORS;
}

var _getCreepLink = function(creep) {
    if(!creep.hasOwnProperty('LINK')) {
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

var _isOpen = function(source, thisCreep) {
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
    for(let ys in list) {
        for(let xs in list[ys]) {
            let terra = false;
            let creep = false;
            for(let i in list[ys][xs]) {
                if(list[ys][xs][i].type == 'creep' && list[ys][xs][i].creep != thisCreep) {
                    creep = true;
                }
                if(list[ys][xs][i].type == 'terrain' && list[ys][xs][i].terrain != 'wall') {
                    terra = true;
                }
            }
            if(terra && !creep) {
                return true;
            }
        }
    }
    return false;
}

var _canBuild = function(room, x, y) {
    if(x < 0 || x > 49 || y < 0 || y > 49){
        return false;
    }

    var things = room.lookAt(x,y);
    for(let i in things) {
        if(things[i].type == 'constructionSite' || things[i].type == 'structure' || (things[i].type == 'terrain' && things[i].terrain == 'wall')) {
            return false;
        }
    }
    return true;
}

var _getPortals = function(room) {
    if(!room.hasOwnProperty('PORTALS')) {
        room.PORTALS = _.filter(_getStructures(room), (structure) => {return (structure.structureType == STRUCTURE_PORTAL)});
    }
    return room.PORTALS;
}

var _avoidSourceKeepersCallback = function(roomName, costMatrix) {
    if(Game.rooms.hasOwnProperty(roomName)) {
        if(!Game.rooms[roomName].controller) {
            var sourceKeepers = _.filter(_getHostileCreeps(Game.rooms[roomName]), (creep) => {return creep.owner.username == 'Source Keeper';});
            for(let i in sourceKeepers) {
                let x = sourceKeepers[i].pos.x;
                let y = sourceKeepers[i].pos.y;
                for(let dx = -3; dx <= 3; dx++) {
                    if(x + dx >= 0 && x + dx < 50) {
                        for(let dy = -3; dy <= 3; dy++) {
                            if(y + dy >= 0 && y + dy < 50) {
                                costMatrix.set(x + dx, y + dy, 254);
                            }
                        }
                    }
                }
            }
        }
    }
}

module.exports = {
    getMyCreeps: _getMyCreeps,
    getHostileCreeps: _getHostileCreeps,
    getHurtCreeps: _getHurtCreeps,
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
    getGroundMinerals: _getGroundMinerals,
    getTombstoneMinerals: _getTombstoneMinerals,
    getContainerEnergy: _getContainerEnergy,
    getClosestStore: _getClosestStore,
    isOpen: _isOpen,
    getEmergencyRepairable: _getEmergencyRepairable,
    getMineral: _getMineral,
    getTowers: _getTowers,
    canBuild: _canBuild,
    getExtractors: _getExtractors,
    getCreepLink: _getCreepLink,
    getRepairableWalls: _getRepairableWalls,
    getPortals: _getPortals,
    getRole: _getRole,
    addRole: _addRole,
    creepNames: _creepNames,
    avoidSourceKeepersCallback: _avoidSourceKeepersCallback
};