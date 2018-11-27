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
type BodyType = 'carrier' | 'fighter' | 'ranger' | 'harvester' | 'miner' | 'scout' | 'worker' | 'claimer';

export const spawnTypes: Record<BodyType, (energyLimit: number, maxEnergy: number) => BodyPartConstant[]> = {
    'carrier': (energyLimit: number, maxEnergy: number) => {
        const energyPerRound = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];
        const partsPerRound = 2;
        const maxParts = MAX_CREEP_SIZE;
        const minParts = 4;

        if(energyLimit < energyPerRound * (minParts / partsPerRound)){ return []; }
        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + energyPerRound <= energyLimit && body.length + partsPerRound <= maxParts) {
            soFar += energyPerRound;
            body.push(CARRY);
            body.push(MOVE);
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

    'ranger': (energyLimit: number, maxEnergy: number) => {
        const energyPerRound = BODYPART_COST[MOVE] + BODYPART_COST[RANGED_ATTACK];
        const partsPerRound = 2;
        const maxParts = MAX_CREEP_SIZE;

        const partNumber = Math.min(Math.floor(energyLimit / energyPerRound), Math.floor(maxParts / partsPerRound));
        const body: BodyPartConstant[] = [];
        for(let i = 0; i < partNumber; i++) {
            body.push(MOVE);
        }
        for(let i = 0; i < partNumber; i++) {
            body.push(RANGED_ATTACK);
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
            soFar += BODYPART_COST[baseBody[body.length % baseBody.length]];
            body.push(baseBody[body.length % baseBody.length]);
        }

        if(body.length < minParts) {
            return [];
        }
        else {
            return body;
        }
    },

    'miner': (energyLimit: number, maxEnergy: number) => {
        const maxParts = MAX_CREEP_SIZE;
        const minParts = 5;
        const minCost = (BODYPART_COST[WORK] * 4) + BODYPART_COST[MOVE];
        const baseBody: BodyPartConstant[] = [MOVE, WORK, WORK, WORK, WORK];

        if(energyLimit < minCost){ return []; }
        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + BODYPART_COST[baseBody[body.length % baseBody.length]] <= energyLimit && body.length < maxParts) {
            soFar += BODYPART_COST[baseBody[body.length % baseBody.length]];
            body.push(baseBody[body.length % baseBody.length]);
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
            soFar += energyPerRound;
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    },

    'claimer': (energyLimit: number, maxEnergy: number) => {
        const energyPerRound = BODYPART_COST[CLAIM] + BODYPART_COST[MOVE];
        const partsPerRound = 2;
        const maxParts = 4;

        if(energyLimit < energyPerRound){ return []; }
        let soFar = 0;
        const body: BodyPartConstant[] = [];
        while(soFar + energyPerRound <= energyLimit && body.length + partsPerRound <= maxParts) {
            soFar += energyPerRound;
            body.push(CLAIM);
            body.push(MOVE);
        }
        return body;
    },
};
