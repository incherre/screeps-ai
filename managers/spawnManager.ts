import { Colony } from "../colony";
import { BusyJob } from "../jobs/busyJob";
import { popMostImportant, shuffle } from "../misc/helperFunctions";
import { EnergyContainer } from "../misc/typeChecking";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { HarvestManager } from "./harvestManager";
import { Manager } from "./manager";

export class SpawnManager extends Manager {
    public static type: string = 'spawn';
    public static minSpawnEnergy: number = 100;

    public generateRequests(): ScreepsRequest[] {
        const requests: ScreepsRequest[] = [];
        for(const building of this.buildings) {
            const test = building as any;
            if((test as EnergyContainer).energy !== undefined && (test as EnergyContainer).energy < (test as EnergyContainer).energyCapacity) {
                requests.push(new DropoffRequest(SpawnManager.type, building));
            }
        }
        return requests;
    }

    public manage(): void {
        const requests: ScreepsRequest[] = this.parent.requests[SpawnRequest.type];

        if(!requests) { return; }
        shuffle(requests);

        let energy: number = this.parent.capital.energyAvailable;
        const energyMax: number = this.parent.capital.energyCapacityAvailable;
        if(energy >= SpawnManager.minSpawnEnergy) {
            for(const building of this.buildings) {
                if(building instanceof StructureSpawn && requests.length > 0 && !building.spawning) {
                    const request = popMostImportant(requests) as SpawnRequest;
                    const memory = {jobType: BusyJob.type, jobInfo: '', colonyRoom: this.parent.capital.name, managerType: request.requester, path: null};
                    const body = request.creepFunction(energy, energyMax);
                    const name = building.name + '-' + Game.time;
                    
                    const status = building.spawnCreep(body, name, {'memory': memory});
                    if(status === OK) {
                        for(const j in body) {
                            energy -= BODYPART_COST[body[j]];
                        }
                    }
                }
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}
