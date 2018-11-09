import { Colony } from "./colony";
import { ErrorMapper } from "./utils/ErrorMapper";

import * as Profiler from "./Profiler/Profiler";
global.Profiler = Profiler.init();
global.__PROFILER_ENABLED__ = true;

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  const creepMap: Map<string, Creep[]> = new Map<string, Creep[]>();
  for(const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if(room.controller && room.controller.my) {
      creepMap.set(roomName, []);
    }
  }

  for(const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    const list = creepMap.get(creep.memory.colonyRoom);
    if(list !== undefined) {
      list.push(creep);
    }
    // What to do if creep doesn't have a home?
  }

  const colonies: Colony[] = [];
  for(const roomName of creepMap.keys()) {
    const room = Game.rooms[roomName];
    const creeps = creepMap.get(roomName);
    if(room && creeps) {
      colonies.push(new Colony(room, creeps));
    }
  }

  for(const colony of colonies) {
    colony.run();
  }
});
