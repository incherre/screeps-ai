import { Colony } from "../colony";
import { BusyJob } from "../jobs/busyJob";
import { popMostImportant, shuffle } from "../misc/helperFunctions";
import { EnergyContainer } from "../misc/typeChecking";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { Manager } from "./manager";

import { profile } from "../Profiler/Profiler";

@profile
export class SpawnManager extends Manager {
    // static parameters
    public static type: string = 'spawn';
    public static minSpawnEnergy: number = 100;

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];

        let buildings: Structure[] = [];
        const extensions = this.parent.structures.get(STRUCTURE_EXTENSION);
        if(extensions) {
            buildings = extensions;
        }

        const spawns = this.parent.structures.get(STRUCTURE_SPAWN);
        if(spawns) {
            buildings = buildings.concat(spawns);
        }

        for(const building of buildings) {
            const test = building as any;
            if((test as EnergyContainer).energy !== undefined && (test as EnergyContainer).energy < (test as EnergyContainer).energyCapacity) {
                requests.push(new DropoffRequest(SpawnManager.type, building));
            }
        }
        return requests;
    }

    public manage(): void {
        if(!this.parent.capital) {
            return;
        }

        let requests: ScreepsRequest[] | undefined = this.parent.requests.get(SpawnRequest.type);

        if(!requests) {
            requests = [];
        }
        shuffle(requests);

        let energy: number = this.parent.capital.energyAvailable;
        const energyMax: number = this.parent.capital.energyCapacityAvailable;
        const spawns = this.parent.structures.get(STRUCTURE_SPAWN);
        if(spawns) {
            for(const building of spawns) {
                if(!(building instanceof Spawn)) {
                    continue;
                }

                if(building.spawning && building.spawning.remainingTime === 1) {
                    this.parent.addWorker(Game.creeps[building.spawning.name]);
                }
                else if(requests.length > 0 && energy >= SpawnManager.minSpawnEnergy) {
                    const request = popMostImportant(requests) as SpawnRequest;
                    const memory = {jobType: BusyJob.type, jobInfo: '', colonyRoom: this.parent.capital.name, managerType: request.requester, path: undefined};
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
