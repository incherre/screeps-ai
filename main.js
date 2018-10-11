/*
Directions for use:
-Every room needs a flag with primary color white and secondary color yellow for extension placement.
-Every room will produce warriors that will go to a flag with both primary and secondary color red if it exists.
-If there is a flag called 'raid' (this name is defined in the raider role) anywhere in the world, the colonies will produce raiders that walk to it.
-If there is a flag called 'heal' (this name is defined in the raider role) anywhere in the world, the raiders will walk to it if injured.
-If there is a flag called 'claim' (this name is defined in the claimer role) anywhere in the world, the colonies will produce claimers to claim the room the flag is in.
-Every structure besides extensions and extractors must be placed manually.
-Creeps of the miner role will not be spawned until a terminal is built.
-Link pairs must be added by id strings in the room controller module.
*/

var creepControl = require('controller.creeps');
var roomControl = require('controller.room');
var trading = require('controller.market');

module.exports.loop = function () {
    creepControl.controlCreeps();
    roomControl.controlEstablishedRooms();

    if(trading.shouldTrade()) {
        trading.trade();
    }
}