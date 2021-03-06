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
    
    for(let name in Game.creeps) {
        try {
            _controlSingleCreep(Game.creeps[name]);
        }
        catch(err) {
            console.log(err.name + ": " + err.message);
            Game.notify(err.name + ": " + err.message, 60 * 24); // only send error notifications every 24 hours
        }
    }
}

var _controlSingleCreep = function(creep) {
    if(creep.fatigue > 0 || creep.spawning) {
        return;
    }
    else if(creep.memory.home && !creep.memory.long_range && (!creep.room.controller || creep.room.controller.id != creep.memory.home)) {
        creep.moveTo(Game.getObjectById(creep.memory.home), {range: 10});
    }
    else if(creep.memory.role && roles[creep.memory.role]){
        roles[creep.memory.role].run(creep);
    }
}

module.exports = {
    controlCreeps: _controlCreeps
};