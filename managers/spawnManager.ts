import { Colony } from "../colony";
import { BusyJob } from "../jobs/busyJob";
import { popMostImportant, shuffle } from "../misc/helperFunctions";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest, spawnFunctions } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class SpawnManager extends Manager {
    // static parameters
    public static type: string = 'spawn';
    public static minSpawnEnergy: number = 100;
    public static spawnImmediatelyPriority: number = 1;

    // inter-tick variables
    public namesToAdd: string[];

    constructor (parent: Colony) {
        super(parent);
        this.namesToAdd = [];
    }

    public tickInit(): void {
        super.tickInit();

        const namesStillToAdd = [];
        for(const name of this.namesToAdd) {
            if(Game.creeps[name]) {
                this.parent.addWorker(Game.creeps[name]);
            }
            else {
                namesStillToAdd.push(name);
            }
        }
        this.namesToAdd = namesStillToAdd;
    }

    public generateRequests(): ScreepsRequest[] {
        if(!this.parent.capital) {
            return [];
        }

        const requests: ScreepsRequest[] = [];

        let buildings: (StructureSpawn | StructureExtension)[] = [];
        const extensions = this.parent.structures.get(STRUCTURE_EXTENSION);
        if(extensions) {
            buildings = extensions as StructureExtension[];
        }

        const spawns = this.parent.structures.get(STRUCTURE_SPAWN);
        if(spawns) {
            buildings = buildings.concat(spawns as StructureSpawn[]);
        }

        for(const building of buildings) {
            if(building.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                requests.push(new DropoffRequest(SpawnManager.type, building, building.store.getFreeCapacity(RESOURCE_ENERGY),
                /*resourceType=*/undefined, /*priority=*/2));
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

                if(!building.spawning && requests.length > 0 && energy >= SpawnManager.minSpawnEnergy) {
                    const request = popMostImportant(requests) as SpawnRequest;
                    const memory = {
                        jobType: BusyJob.type,
                        jobInfo: '',
                        colonyRoom: this.parent.capital.name,
                        managerType: request.requester,
                        path: undefined
                    };
                    const body = spawnFunctions[request.creepBody](request.priority <= SpawnManager.spawnImmediatelyPriority ? energy : energyMax);
                    const totalCost = _.sum(body, (part) => BODYPART_COST[part]);
                    const name = building.name + '-' + Game.time;

                    // Hold out for full capacity if the priority isn't pressing.
                    if (totalCost > energy) {
                        requests.push(request);
                        break;
                    }

                    const status = building.spawnCreep(body, name, {'memory': memory});
                    if(status === OK) {
                        this.namesToAdd.push(name);
                        energy -= totalCost;
                    }
                }
            }
        }
    }
}
