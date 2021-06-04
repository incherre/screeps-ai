interface CreepMemory {
  jobType: string | undefined;
  jobInfo: string | undefined;
  colonyRoom: string | undefined;
  managerType: string | undefined;
  path: string | undefined;
}

interface RoomMemory {
  needsVision: boolean | undefined;
  parent: string | undefined;
  core: {x: number, y: number} | undefined;
  layout: {[key: string]: {x: number, y: number}[]} | undefined;
}

interface Memory {
  marketHistory: {[key: string]: number[]} | undefined;
  seenRooms: {[key: string]: {owner: string | null, level: number, lastObserved: number}} | undefined;
  username: string | undefined;
}

declare namespace NodeJS {
  interface Global {
    empire: any | undefined;
    trafficController: any | undefined;
    myMaps: {[key: string]: Array<Array<{exitDist: number, wallDist: number, sourceDist: number[], controllerDist:number}>>} | undefined;
    myPathfinderCosts: {[key: string]: {mat: CostMatrix, time: number}} | undefined;
    myRoomCosts: {[key: string]: {cost: number, time: number}} | undefined;
  }
}
