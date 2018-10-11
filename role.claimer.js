/*
This is the AI for the claimer role.
A claimer should move to the room that has the 'claim' flag in it.
Once a claimer is in that room, it should attempt to claim that room's controller. If claiming fails, then it should reserve it instead.
*/

// ***** Options *****
var midpoint = 'midClaim'; // a waypoint to help avoid bad people
var claimerFlag = 'claim'; // the name of the flag to look for
var maxClaimerParts = 2; // the maximum number of MOVE, and CLAIM parts a claimer can have
// ***** End *****

var find = require('manager.roomInfo');

var _run = function(creep){
    if(!Game.flags.hasOwnProperty(claimerFlag)) { // if there is no flag, we can't do anything
        return;
    }
    else if(!Game.flags.hasOwnProperty(midpoint) || creep.memory.halfway) {
        var target = Game.flags[claimerFlag];
    }
    else{
        var target = Game.flags[midpoint];
    }

    if(Game.flags[claimerFlag].room == creep.room) {
        var retVal = creep.claimController(Game.flags[claimerFlag].room.controller);
        if(retVal == ERR_NOT_IN_RANGE) {
            creep.moveTo(Game.flags[claimerFlag].room.controller);
        }
        else if(retVal == ERR_GCL_NOT_ENOUGH && creep.reserveController(Game.flags[claimerFlag].room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(Game.flags[claimerFlag].room.controller);
        }
    }
    else if(Game.flags.hasOwnProperty(midpoint) && Game.flags[midpoint].room == creep.room && find.getPortals(creep.room).length > 0) {
        creep.memory.halfway = true;
        creep.moveTo(creep.pos.findClosestByRange(find.getPortals(creep.room)));
    }
    else if(Game.flags.hasOwnProperty(midpoint) && Game.flags[midpoint].room == creep.room) {
        creep.memory.halfway = true;
    }
    else {
        creep.moveTo(target, {avoid: find.getPortals(creep.room)});
    }
}

var _shouldClaim = function() {
    return Game.flags.hasOwnProperty(claimerFlag);
}

var _make = function(spawn, energy_limit) { // make a claimer
    var numOfPart = Math.floor(energy_limit / 650);
    if(numOfPart > maxClaimerParts){numOfPart = maxClaimerParts;}

    var body = [];
    for(let i = 0; i < numOfPart; i++) {
        body.push(MOVE);
        body.push(CLAIM);
    }

    var mem = {role: 'claimer', home: spawn.room.controller.id, long_range: true, halfway: false};

    var retVal = spawn.createCreep(body, null, mem);
    if(retVal < 0) {
        return 0;
    }
    else {
        find.addRole(Game.creeps[retVal], 'claimer');
        
        var total = 0;
        for(let i = 0; i < body.length; i++) {
            total +=  BODYPART_COST[body[i]];
        }
        return total;
    }
}

var _shouldMake = function(room) {
	if(_shouldClaim()) {
		return find.getRole(room, 'claimer').length < 1;
	}
	else {
		return false;
	}
}

module.exports = {
    run: _run,
    shouldMake: _shouldMake,
    make: _make
};