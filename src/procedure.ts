declare global {
  interface SavedProcedure {
    priority: number,
    lastRunTick: number,
    type: string,
    procData: string,
  }
}

export enum RunResult {
  Succeeded,
  Failed,
  InvalidPrecondition,
  Running,
  Skip,
}

export abstract class Procedure {
  id: number;
  priority: number;
  lastRunTick: number;

  constructor(id: number, saved: SavedProcedure) {
    this.id = id;
    this.priority = saved.priority;
    this.lastRunTick = saved.lastRunTick;
    this._deserializeState(saved.procData);
  }

  // Serialize any necessary state to a string.
  abstract _serializeState(): string;

  // Read any necessary state from the provided string.
  abstract _deserializeState(procData: string): void;

  // Run the main logic of the procedure.
  abstract _runInternal(): RunResult;

  // Get the type of the procedure.
  abstract getType(): string;

  // Return the memory-representation of the procedure.
  serialize(): SavedProcedure {
    return {
      priority: this.priority,
      lastRunTick: this.lastRunTick,
      type: this.getType(),
      procData: this._serializeState(),
    };
  }

  run(): RunResult {
    if (this.lastRunTick >= Game.time) {
      console.log(`Procedure ${this.id} tried to run more than once in the same tick.`);
      return RunResult.Skip;
    }
    this.lastRunTick = Game.time;
    return this._runInternal();
  }
}
