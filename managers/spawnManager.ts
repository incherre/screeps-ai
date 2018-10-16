import { Colony } from "../colony";
import { BusyJob } from "../jobs/busyJob";
import { ScreepsRequest } from "../requests/request";
import { SpawnRequest } from "../requests/spawnRequest";
import { Manager } from "./manager";

export class SpawnManager extends Manager {
    public static spawnTypes: {[key: string]: (energyLimit: number) => BodyPartConstant[]} = {
        'carrier': (energyLimit: number) => {
            let soFar = 0;
            const body: BodyPartConstant[] = [];
            while(soFar + 100 < energyLimit) {
                body.push(CARRY);
                body.push(MOVE);
                soFar += 100;
            }
            return body;
        },

        'worker': (energyLimit: number) => {
            let soFar = 0;
            const body: BodyPartConstant[] = [];
            while(soFar + 200 < energyLimit) {
                body.push(WORK);
                body.push(CARRY);
                body.push(MOVE);
                soFar += 200;
            }
            return body;
        },
    };

    public generateRequests(): ScreepsRequest[] {
        return [];
    }

    public manage(): void {
        const requests: ScreepsRequest[] = this.parent.requests.spawn;
        if(!requests) { return; }

        let energy: number = this.parent.capital.energyAvailable;
        for(const i in this.buildings) {
            if(this.buildings[i].structureType === STRUCTURE_SPAWN && requests.length > 0) {
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