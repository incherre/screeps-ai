/*
This is the module that controls creep actions. Logic that is applicable to all creeps is put here. This module makes use of the role modules.
*/

var roles = {
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
}

var _controlCreeps = function() {
    for(let i in Memory.creeps) {
        if(!Game.creeps[i]) {
            delete Memory.creeps[i];
        }
    }
    
    let timeBefore = Game.cpu.getUsed();
    let count = 0;
    for(let name in Game.creeps) {
        _controlSingleCreep(Game.creeps[name]);
        count++;
    }
    // console.log("Creeps took " + ((Game.cpu.getUsed() - timeBefore) / count).toFixed(2) + " CPU on average");
}

var _controlSingleCreep = function(creep) {
    if(creep.fatigue > 0 || creep.spawning) {
        return;
    }
    else if(!creep.memory.long_range && creep.room.controller != undefined && creep.room.controller.id != creep.memory.home) {
        creep.moveTo(Game.getObjectById(creep.memory.home))
    }
    else {
        for(let key in roles) {
            if(key == creep.memory.role) {
                roles[key].run(creep);
                break;
            }
        }
    }
}

module.exports = {
    controlCreeps: _controlCreeps
};