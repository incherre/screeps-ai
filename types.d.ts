interface CreepMemory {
  jobType: string;
  jobInfo: string;
  colonyRoom: string;
  managerType: string;
}

interface RoomMemory {
  parent: string | null;
  seedX: number | null;
  seedY: number | null;
}

interface Memory {
  uuid: number;
  log: any;
}

declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
