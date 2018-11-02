import { ScreepsRequest } from "./request";

export class SpawnRequest extends ScreepsRequest {
    public static type = 'spawn';
    public creepFunction: (energyLimit: number, maxEnergy: number) => BodyPartConstant[];

    public getType(): string {
        return SpawnRequest.type;
    }

    constructor (requester: string, creepFunction: (energyLimit: number, maxEnergy: number) => BodyPartConstant[], priority: number = 3) {
        super();
        this.requester = requester;
        this.creepFunction = creepFunction;
        this.priority = priority;
    }
}

// -----Creep Generating Functions-----
export const spawnTypes: {[key: string]: (energyLimit: number, maxEnergy: number) => BodyPartConstant[]} = {
    'carrier': (energyLimit: number, maxEnergy: number) => {
        if(energyLimit < 200){ return []; }

        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + 100 <= energyLimit) {
            body.push(CARRY);
            body.push(MOVE);
            soFar += 100;
        }
        return body;
    },

    'fighter': (energyLimit: number, maxEnergy: number) => {
        const partNumber = Math.floor(energyLimit / (BODYPART_COST[MOVE] + BODYPART_COST[ATTACK]));
        const body: BodyPartConstant[] = [];
        for(let i = 0; i < partNumber; i++) {
            body.push(MOVE);
        }
        for(let i = 0; i < partNumber; i++) {
            body.push(ATTACK);
        }
        return body;
    },

    'harvester': (energyLimit: number, maxEnergy: number) => {
        if(energyLimit < 250){ return []; }

        let soFar = 0;
        const baseBody: BodyPartConstant[] = [MOVE, WORK, WORK, WORK];
        const body: BodyPartConstant[] = [];
        while(soFar + BODYPART_COST[baseBody[body.length % baseBody.length]] <= energyLimit && body.length < 8) {
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
    
    'scout': (energyLimit: number, maxEnergy: number) => {
        return [MOVE];
    },

    'worker': (energyLimit: number, maxEnergy: number) => {
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
