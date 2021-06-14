import { TrafficController } from "misc/trafficController";
import { Empire } from "./empire";
import { ErrorMapper } from "./utils/ErrorMapper";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  const empire = Empire.getEmpire(); // get or make the global instance

  empire.tickInit(); // regen everything that's one tick only

  empire.generateRequests(); // everyone ask for things

  empire.run(); // everyone do things

  TrafficController.getTrafficController().finalizeMoves(); // move creeps

  empire.cleanup(); // prepare things for the next tick
});
