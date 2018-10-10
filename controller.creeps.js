/*
This is the module that controls creep actions. Logic that is applicable to all creeps is put here. This module makes use of the role modules.
*/

var roles = {
    handyman: require('role.handyman'),
    courier: require('role.courier'),
    harvester: require('role.harvester'),
    upgrader: require('role.upgrader'),
    //claimer: require('role.claimer'),
    miner: require('role.miner'),
    //warrior: require('role.warrior'),
    //raider: require('role.raider'),
    waller: require('role.waller'),
    ldh: require('role.ldh'),
    //healer: require('role.healer')
}

var _controlCreeps = function(){
    for(let i in Memory.creeps) {
        if(!Game.creeps[i]) {
            delete Memory.creeps[i];
        }
    }

    for(let name in Game.creeps){
        _controlSingleCreep(Game.creeps[name]);
    }
}

var _controlSingleCreep = function(creep){
    if(creep.fatigue > 0 || creep.spawning){
        return;
    }
    else if(!creep.memory.long_range && creep.room.controller != undefined && creep.room.controller.id != creep.memory.home){
        creep.moveTo(Game.getObjectById(creep.memory.home))
    }
    else {
        for(let key in roles){
            if(key == creep.memory.role){
                roles[key].run(creep);
                break;
            }
        }
    }
}

module.exports = {
    controlCreeps: _controlCreeps
};