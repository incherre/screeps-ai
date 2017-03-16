/*
This is the AI for the healer role.
A healer should go to the room specified by healFlag and heal the friendly creep with the lowest percent health.
*/

// ***** Options *****
var healFlag = 'heal';
var maxHealerParts = 6;
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep){
    var targets = find.getHurtCreeps(creep.room);

    if(targets.length > 0){
        var hitsMin = Math.min.apply(null, targets.map(function(thisCreep){return thisCreep.hits;}));
        var target = creep.pos.findClosestByRange(targets, {filter: (thisCreep) => {return thisCreep.hits == hitsMin;}})

        creep.moveTo(target);
        if(creep.pos.isNearTo(target)){
            creep.heal(target);
        }
        else{
            creep.rangedHeal(target);
        }
    }
    else if(Game.flags.hasOwnProperty(healFlag) && (creep.memory.long_range || Game.flags[healFlag].room == creep.room)){
        creep.moveTo(Game.flags[healFlag]);
    }
    else{
        creep.moveTo(creep.pos.findClosestByRange(find.getWarriors(creep.room)));
    }
}

var _shouldHeal = function(){
    return Game.flags.hasOwnProperty(healFlag);
}

var _make = function(spawn, energy_limit){
    var numOfPart = Math.floor(energy_limit / 300);
    if(numOfPart > maxHealerParts){numOfPart = maxHealerParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++){
        body.push(MOVE);
    }
    for(let i = 0; i < numOfPart; i++){
        body.push(HEAL);
    }

    var mem = {role: 'healer', home: spawn.room.controller.id, long_range: false};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0){
        return 0;
    }
    else{
        spawn.room.MY_CREEPS.push(Game.creeps[retVal]);
        spawn.room.HEALERS.push(Game.creeps[retVal]);
        var total = 0;
        for(let i = 0; i < body.length; i++){
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room){
    return find.getHealers(room).length < find.getHurtCreeps(room).length;
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};