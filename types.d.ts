interface CreepMemory {
  jobType: string;
  jobInfo: string;
  colonyRoom: string;
  managerType: string;
  path: string | undefined;
}

interface RoomMemory {
  needsVision: boolean | undefined;
  parent: string | undefined;
  seed: {x: number, y: number, r: number} | undefined;
  lab: {dx: number, dy: number, r: number} | undefined;
  petals: Array<{dx: number, dy: number, r: number}> | undefined;
}

interface Memory {
  marketHistory: {[key: string]: number[]} | undefined;
  seenRooms: {[key: string]: {owner: string | null, level: number, lastObserved: number}} | undefined;
  username: string | undefined;
}

declare namespace NodeJS {
  interface Global {
    Profiler: Profiler | undefined;
    empire: any | undefined;
    myMaps: {[key: string]: Array<Array<{exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number}>>} | undefined;
    myCosts: {[key: string]: {mat: CostMatrix, time: number}} | undefined;
  }
}
