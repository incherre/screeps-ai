import { Colony } from "./colony";
import { ErrorMapper } from "./utils/ErrorMapper";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  if(Object.keys(Game.rooms).length > 0){
    const testRoom = Game.rooms[Object.keys(Game.rooms)[0]];

    const testColony = new Colony(testRoom);
    testColony.run();
  }
});
