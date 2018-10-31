import { Colony } from "../colony";
import { BusyJob } from "../jobs/busyJob";
import { shuffle } from "../misc/helperFunctions";
import { EnergyContainer } from "../misc/typeChecking";
import { DropoffRequest } from "../requests/dropoffRequest";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { HarvestManager } from "./harvestManager";
import { Manager } from "./manager";

export class SpawnManager extends Manager {
    public static type: string = 'spawn';
    public static spawnTypes: {[key: string]: (energyLimit: number) => BodyPartConstant[]} = {
        'carrier': (energyLimit: number) => {
            let soFar = 0;
            const body: BodyPartConstant[] = [];
            while(soFar + 100 <= energyLimit) {
                body.push(CARRY);
                body.push(MOVE);
                soFar += 100;
            }
            return body;
        },

        'harvester': (energyLimit: number) => {
            let soFar = 0;
            const baseBody: BodyPartConstant[] = [MOVE, WORK, WORK, WORK];
            const body: BodyPartConstant[] = [];
            while(soFar + BODYPART_COST[baseBody[body.length % baseBody.length]] <= energyLimit) {
                body.push(baseBody[body.length % baseBody.length]);
                soFar += BODYPART_COST[baseBody[body.length % baseBody.length]];
            }

            if(body.length < 3) {
                return [];
            }
            else {
                return body;
            }
        },
        
        'scout': (energyLimit: number) => {
            return [MOVE];
        },

        'worker': (energyLimit: number) => {
            let soFar = 0;
            const body: BodyPartConstant[] = [];
            while(soFar + 200 <= energyLimit) {
                body.push(WORK);
                body.push(CARRY);
                body.push(MOVE);
                soFar += 200;
            }
            return body;
        },
    };

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
        let emergency = this.parent.capital.find(FIND_MY_CREEPS).length === 0;

        if(!requests && !emergency) { return; }
        shuffle(requests);

        let energy: number = this.parent.capital.energyAvailable;
        for(const i in this.buildings) {
            if(this.buildings[i].structureType === STRUCTURE_SPAWN && emergency) {
                const spawn = this.buildings[i] as StructureSpawn;
                const memory = {jobType: BusyJob.type, jobInfo: '', colonyRoom: this.parent.capital.name, managerType: HarvestManager.type};
                const body = SpawnManager.spawnTypes.harvester(energy);
                const name = spawn.name + '-' + Game.time;

                const status = spawn.spawnCreep(body, name, {'memory': memory});
                if(status === OK) {
                    for(const j in body) {
                        energy -= BODYPART_COST[body[j]];
                    }

                    emergency = false;
                }
                else {
                    break;
                }
            }
            else if(this.buildings[i].structureType === STRUCTURE_SPAWN && requests.length > 0) {
                const request = requests.pop() as SpawnRequest;
                const spawn = this.buildings[i] as StructureSpawn;
                const memory = {jobType: BusyJob.type, jobInfo: '', colonyRoom: this.parent.capital.name, managerType: request.requester};
                const body = SpawnManager.spawnTypes[request.creepType](energy);
                const name = spawn.name + '-' + Game.time;
                
                const status = spawn.spawnCreep(body, name, {'memory': memory});
                if(status === OK) {
                    for(const j in body) {
                        energy -= BODYPART_COST[body[j]];
                    }
                }
            }
        }
    }

    constructor (parent: Colony) {
        super(parent);
    }
}