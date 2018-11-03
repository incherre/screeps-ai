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
        const energyPerRound = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
        const partsPerRound = 2;
        const maxParts = MAX_CREEP_SIZE;

        if(energyLimit < partsPerRound * energyPerRound){ return []; }
        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + energyPerRound <= energyLimit && body.length + 2 <= maxParts) {
            body.push(CARRY);
            body.push(MOVE);
            soFar += energyPerRound;
        }
        return body;
    },

    'fighter': (energyLimit: number, maxEnergy: number) => {
        const energyPerRound = BODYPART_COST[MOVE] + BODYPART_COST[ATTACK];
        const partsPerRound = 2;
        const maxParts = MAX_CREEP_SIZE;

        const partNumber = Math.min(Math.floor(energyLimit / energyPerRound), Math.floor(maxParts / partsPerRound));
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
        const maxParts = 8;
        const minParts = 3;
        const minCost = BODYPART_COST[WORK] + BODYPART_COST[WORK] + BODYPART_COST[MOVE];
        const baseBody: BodyPartConstant[] = [MOVE, WORK, WORK, WORK];

        if(energyLimit < minCost){ return []; }
        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + BODYPART_COST[baseBody[body.length % baseBody.length]] <= energyLimit && body.length < maxParts) {
            body.push(baseBody[body.length % baseBody.length]);
            soFar += BODYPART_COST[baseBody[body.length % baseBody.length]];
        }

        if(body.length < minParts) {
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
        const energyPerRound = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
        const partsPerRound = 3;
        const maxParts = MAX_CREEP_SIZE;

        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + energyPerRound <= energyLimit && body.length + partsPerRound <= maxParts) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
            soFar += energyPerRound;
        }
        return body;
    },
};
