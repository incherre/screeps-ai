/*
This is the AI for the warrior role.
A warrior should go to a flag.
Once a warrior is in the same room as it's flag, if there are enemy creeps, it will attack them
*/

// ***** Options *****
var maxWarriorParts = 10;
var message = ['placeholder', 'any energy', 'that you', 'use to', 'attack me', 'isn\'t used', 'for your', 'colony. :('];
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep){
    var enemy = creep.pos.findClosestByRange(find.getHostileCreeps(creep.room));
    if(enemy == null){
        var flag = creep.pos.findClosestByRange(_findWarriorFlags(creep.room));
        creep.moveTo(flag);
    }
    else if(creep.attack(enemy) == ERR_NOT_IN_RANGE) {
        creep.moveTo(enemy);
    }
    
    if(enemy != null){
        if(!creep.memory.was_enemy){
            creep.memory.start_time = Game.time;
            creep.memory.was_enemy = true;
        }
        
        if((Game.time - creep.memory.start_time) % message.length == 0){
            creep.say(enemy.owner.username, true);
        }
        else{
            creep.say(message[(Game.time - creep.memory.start_time) % message.length], true);
        }
    }
    else{
        creep.memory.was_enemy = false;
    }
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 130);
    if(numOfPart > maxWarriorParts){numOfPart = maxWarriorParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(MOVE);
    }
    for(let i = 0; i < numOfPart; i++){
        body.push(ATTACK);
    }

    var mem = {role: 'warrior', home: spawn.room.controller.id, long_range: false, start_time: Game.time, was_enemy: false};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        spawn.room.MY_CREEPS.push(Game.creeps[retVal]);
        spawn.room.WARRIORS.push(Game.creeps[retVal]);
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _findWarriorFlags = function(room){
    if(!room.hasOwnProperty('WARRIOR_FLAGS')){
        room.WARRIOR_FLAGS = room.find(FIND_FLAGS, {filter: (flag) => {return (flag.color == COLOR_RED && flag.secondaryColor == COLOR_RED);}});
    }
    return room.WARRIOR_FLAGS;
}

var _shouldFight = function(room){
    return _findWarriorFlags(room).length > 0 && room.controller.level > 2;
}

var _shouldMake = function(room){
    var target = 0;
    if(_shouldFight(room)){
        target = find.getHostileCreeps(room).length + 1;
    }
    else{
        target = find.getHostileCreeps(room).length;
    }

    return find.getWarriors(room).length < target;
}

module.exports = {
    run: _run,
    make: _make,
    shouldMake: _shouldMake
};