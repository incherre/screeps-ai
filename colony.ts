import { HarvestManager } from "./managers/harvestManager";
import { Manager } from "./managers/manager";
import { SpawnManager } from "./managers/spawnManager";
import { TransportManager } from "./managers/transportManager";
import { Ownable } from "./misc/typeChecking";
import { ScreepsRequest } from "./requests/request";
import { WorkerCreep } from "./worker";

export class Colony {
    public capital: Room;
    public farms: Room[];
    public managers: Manager[];
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

    constructor (capital: Room) {
        this.capital = capital;

        this.farms = []; // TODO(Daniel): check neighboring rooms to see if they are being used
        this.managers = [];
        this.requests = {}; // TODO(Daniel): find any requests from last tick that haven't expired

        const harvestManager = new HarvestManager(this);
        const spawnManager = new SpawnManager(this);
        const transportManager = new TransportManager(this);

        const structures = capital.find(FIND_STRUCTURES, {filter: (structure: any) => (structure as Ownable).my === undefined || (structure as Ownable).my});
        for(const i in structures) {
            if(structures[i].structureType === STRUCTURE_SPAWN) {
                spawnManager.buildings.push(structures[i]);
                transportManager.buildings.push(structures[i]);
            }
            else if(structures[i].structureType === STRUCTURE_EXTENSION || structures[i].structureType === STRUCTURE_CONTAINER) {
                transportManager.buildings.push(structures[i]);
            }
        }

        const creeps = capital.find(FIND_MY_CREEPS);
        for(const i in creeps) {
            if(creeps[i].memory.managerType === HarvestManager.type) {
                harvestManager.workers.push(new WorkerCreep(creeps[i]));
            }
            else if(creeps[i].memory.managerType === TransportManager.type) {
                transportManager.workers.push(new WorkerCreep(creeps[i]));
            }
        }

        this.managers.push(harvestManager);
        this.managers.push(spawnManager);
        this.managers.push(transportManager);
    }
}
