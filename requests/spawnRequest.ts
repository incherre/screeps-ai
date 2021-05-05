import { ScreepsRequest } from "./request";

/**
 * The possible types of creep bodies to produce.
 */
export type BodyType = 'carrier' | 'fighter' | 'ranger' | 'harvester' | 'miner' | 'scout' | 'worker' | 'claimer';

/**
 * A request to spawn a new creep.
 * @property {BodyType} creepBody - The type of creep to make
 */
export class SpawnRequest extends ScreepsRequest {
    public static type = 'spawn';
    public creepBody: BodyType;

    public getType(): string {
        return SpawnRequest.type;
    }

    constructor (requester: string, creepBody: BodyType, priority: number = 3) {
        super(requester, priority);
        this.requester = requester;
        this.creepBody = creepBody;
        this.priority = priority;
    }
}

/**
 * Constructs a full creep body array based on the given parameters.
 * @param {BodyPartConstant[]} bodyTemplate - An array of body part constants that will be repeated to construct the body
 * @param {number} energyLimit - The maximum amount of energy available in this room for spawning
 * @param {number} maxEnergy - The spawning energy capacity of the room, currently unused
 * @param {number} minParts - The minimum amount of parts required for spawning
 * @param {number} maxParts - The maximum allowed parts in the creep body
 * @returns {BodyPartConstant[]} - The full body part array used for spawning
 */
function genericBodyFunction(bodyTemplate: BodyPartConstant[], energyLimit: number, minParts: number, maxParts: number = MAX_CREEP_SIZE): BodyPartConstant[] {
    const energyPerRound: number = _.sum(bodyTemplate, (part: BodyPartConstant) => BODYPART_COST[part]);
    const partsPerRound: number = bodyTemplate.length;

    if(energyLimit < energyPerRound * (minParts / partsPerRound)) {
        return [];
    }

    const partNumber: number = Math.min(Math.floor(energyLimit / energyPerRound), Math.floor(maxParts / partsPerRound));
    let body: BodyPartConstant[] = [];
    for(const part of bodyTemplate) {
        for(let i = 0; i < partNumber; i++) {
            body.push(part);
        }
    }
    return body;
}

/**
 * A map of body types to functions used for generating the body array for that type.
 */
export const spawnFunctions: Record<BodyType, (energyLimit: number) => BodyPartConstant[]> = {
    'carrier': (energyLimit: number) => {
        return genericBodyFunction([CARRY, MOVE], energyLimit, /*minParts=*/4);
    },

    'fighter': (energyLimit: number) => {
        return genericBodyFunction([MOVE, ATTACK], energyLimit, /*minParts=*/2);
    },

    'ranger': (energyLimit: number) => {
        return genericBodyFunction([MOVE, RANGED_ATTACK], energyLimit, /*minParts=*/2);
    },

    'harvester': (energyLimit: number) => {
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

    'miner': (energyLimit: number) => {
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

    'scout': (energyLimit: number) => {
        return [MOVE];
    },

    'worker': (energyLimit: number) => {
        return genericBodyFunction([WORK, CARRY, MOVE], energyLimit, /*minParts=*/3);
    },

    'claimer': (energyLimit: number) => {
        return genericBodyFunction([CLAIM, MOVE], energyLimit, /*minParts=*/2, /*maxParts=*/4);
    },
};
