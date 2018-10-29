import { Manager } from "./managers/manager";
import { buildingOwnership, managerTypes } from "./manifest";
import { getAdjacentRooms } from "./misc/helperFunctions";
import { ScreepsRequest } from "./requests/request";
import { WorkerCreep } from "./worker";

export class Colony {
    public capital: Room;
    public farms: string[];
    public managers: {[key: string]: Manager};
    public requests: {[key: string]: ScreepsRequest[]};

    public run(): void{
        for(const manager in this.managers) {
            const newRequests = this.managers[manager].generateRequests();
            for(const i in newRequests) {
                if(!this.requests[newRequests[i].getType()]){
                    this.requests[newRequests[i].getType()] = [];
                }
                this.requests[newRequests[i].getType()].push(newRequests[i]);
            }
        }
    
        for(const manager in this.managers) {
            this.managers[manager].manage();
        }

        // TODO(Daniel): save anything that needs to be multi-tick
    }

    constructor (capital: Room, creeps: Creep[]) {
        this.capital = capital;
        this.managers = {};
        this.requests = {};

        this.farms = [];
        for(const roomName of getAdjacentRooms(capital.name)) {
            if(Memory.rooms[roomName] && Memory.rooms[roomName].parent === capital.name) {
                this.farms.push(roomName);
            }
        }

        for(const key of Object.keys(managerTypes)) {
            this.managers[key] = managerTypes[key](this);
        }

        const structures = capital.find(FIND_STRUCTURES, {filter: (structure: any) => !(structure instanceof OwnedStructure) || (structure as OwnedStructure).my});
        for(const struct of structures) {
            if(struct.structureType in buildingOwnership) {
                for(const managerName of buildingOwnership[struct.structureType]) {
                    if(managerName in this.managers) {
                        this.managers[managerName].buildings.push(struct);
                    }
                }
            }
        }

        for(const creep of creeps) {
            if(creep.memory.managerType in this.managers) {
                this.managers[creep.memory.managerType].workers.push(new WorkerCreep(creep));
            }
        }
    }
}
