interface CreepMemory {
  jobType: string;
  jobInfo: string;
  colonyRoom: string;
  managerType: string;
}

interface RoomMemory {
  parent: string;
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
