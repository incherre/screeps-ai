import { Empire } from "./empire";
import { ErrorMapper } from "./utils/ErrorMapper";

import * as Profiler from "./Profiler/Profiler";
global.Profiler = Profiler.init();
global.__PROFILER_ENABLED__ = true;

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  const empire = Empire.getEmpire(); // get or make the global instance

  empire.tickInit(); // regen everything that's one tick only
  
  empire.generateRequests(); // everyone ask for things
  
  empire.run(); // everyone do things

  empire.cleanup(); // prepare things for the next tick
});
