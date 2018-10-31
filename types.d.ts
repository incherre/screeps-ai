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
}

interface Memory {
  seenRooms: {[key: string]: {owner: string | null, level: number, lastObserved: number}} | null;
  username: string | null;
}

declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
