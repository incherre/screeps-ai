interface CreepMemory {
  jobType: string;
  jobInfo: string;
  colonyRoom: string;
  managerType: string;
}

interface RoomMemory {
  needsVision: boolean | null;
  parent: string | null;
  seedX: number | null;
  seedY: number | null;
  seed: {x: number, y: number, r: number} | null;
  lab: {dx: number, dy: number, r: number} | null;
  petals: Array<{dx: number, dy: number, r: number}> | null;
}

interface Memory {
  seenRooms: {[key: string]: {owner: string | null, level: number, lastObserved: number}} | null;
  username: string | null;
}

declare namespace NodeJS {
  interface Global {
    myMaps: {[key: string]: Array<Array<{exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number}>>} | null;
  }
}
