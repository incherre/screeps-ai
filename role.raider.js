/*
This is the AI for the raider role.
A raider should move to the room that has the 'raid' flag in it.
Once a raider is in that room, it should fight any enemies that appear in the room.
If the raider is injured and idle, it should move to the 'heal' flag.
*/

// ***** Options *****
var raiderFlag = 'raid';
var healFlag = 'heal';
var maxRaiderParts = 12;
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep){
    if(creep.memory.notify && !creep.spawning){
        creep.memory.notify = false;
        creep.notifyWhenAttacked(false);
    }
    
    var enemy = creep.pos.findClosestByRange(find.getHostileCreeps(creep.room));
    if(creep.attack(enemy) == ERR_NOT_IN_RANGE) {
        creep.moveTo(enemy);
    }
    else if(enemy == null && creep.hits < creep.hitsMax && Game.flags.hasOwnProperty(healFlag)){
        creep.moveTo(Game.flags[healFlag]);
    }
    else if(enemy == null && _shouldRaid()){
        creep.moveTo(Game.flags[raiderFlag]);
    }
}

var _shouldRaid = function(){
    return Game.flags.hasOwnProperty(raiderFlag);
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 190);
    if(numOfPart > maxRaiderParts){numOfPart = maxRaiderParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(TOUGH);
    }
    for(let i = 0; i < numOfPart; i++){
        body.push(MOVE);
        body.push(MOVE);
    }
    for(let i = 0; i < numOfPart; i++){
        body.push(ATTACK);
    }

    var mem = {role: 'raider', home: spawn.room.controller.id, long_range: true, notify: true, waiting: true};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        spawn.room.MY_CREEPS.push(Game.creeps[retVal]);
        Game.RAIDERS.push(Game.creeps[retVal]);
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room){
    if(_shouldRaid()){
		return find.getRaiders(room).length < 2;
	}
	else{
		return false;
	}
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};