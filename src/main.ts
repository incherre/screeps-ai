import { ErrorMapper } from "./utils/ErrorMapper";
import { RunResult } from "./procedure";
import { makeProcedure } from "./procedure_registry";

declare global {
  interface RawMemory {
    _parsed: any;
  }

  interface Memory {
    procedures: {[id: number]: SavedProcedure} | undefined;
  }

  namespace NodeJS {
    interface Global {
      my_memory: Memory | undefined;
      tick: number | undefined;
      Memory: Memory | undefined;
    }
  }
}

function main() {
  if (!Memory.procedures) {
    Memory.procedures = {};
  }

  for (const id in Memory.procedures) {
    const saved = Memory.procedures[id];
    if (!makeProcedure.hasOwnProperty(saved.type)) {
      console.log(`Procedure ${id} had an invalid type: ${saved.type}.`);
      continue;
    }

    const procedure =  makeProcedure[saved.type](saved);
    const result = procedure.run();

    if (result in [RunResult.Failed, RunResult.InvalidPrecondition]) {
      console.log(`Procedure ${id} failed or was invalid.`);
    }

    if (result in [RunResult.Running, RunResult.Skip]) {
      Memory.procedures[id] = procedure.serialize();
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  if (global.tick && global.tick + 1 === Game.time && global.my_memory) {
    delete global.Memory;
    global.Memory = global.my_memory;
  } else {
    global.my_memory = Memory;
  }
  global.tick = Game.time;

  main();

  RawMemory._parsed = Memory;
});
