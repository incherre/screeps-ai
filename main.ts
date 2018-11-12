import { Empire } from "./empire";
import { ErrorMapper } from "./utils/ErrorMapper";

import * as Profiler from "./Profiler/Profiler";
global.Profiler = Profiler.init();
global.__PROFILER_ENABLED__ = true;

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  const empire = new Empire(); // init
  
  empire.generateRequests(); // everyone ask for things
  
  empire.run(); // everyone do things
});
