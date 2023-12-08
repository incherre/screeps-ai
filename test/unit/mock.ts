export const Game: {
  creeps: { [name: string]: any };
  rooms: any;
  spawns: any;
  time: any;
} = {
  creeps: {},
  rooms: [],
  spawns: {},
  time: 12345
};

export const Memory: {
  procedures: {[id: number]: SavedProcedure} | undefined;
} = {
  procedures: undefined
};
