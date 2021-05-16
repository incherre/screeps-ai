import { ScreepsRequest } from "./request";

/**
 * The possible types of creep bodies to produce.
 */
export type BodyType = 'carrier' | 'fighter' | 'ranger' | 'harvester' | 'miner' | 'scout' | 'worker' | 'claimer';

/**
 * A request to spawn a new creep.
 * @property {BodyType} creepBody - The type of creep to make
 * @property {boolean} empireDirect - Whether the creep should be directly managed by the Empire, or be associated with a Colony
 */
export class SpawnRequest extends ScreepsRequest {
    public static type = 'spawn';

    public creepBody: BodyType;
    public empireDirect: boolean;

    public getType(): string {
        return SpawnRequest.type;
    }

    constructor (requester: string, roomName: string, creepBody: BodyType, priority: number = 3, empireDirect: boolean = false) {
        super(requester, roomName, priority);
        this.requester = requester;
        this.creepBody = creepBody;
        this.priority = priority;
        this.empireDirect = empireDirect;
    }
}

/**
 * Constructs a full creep body array based on the given parameters.
 * @param {BodyPartConstant[]} bodyTemplate - An array of body part constants that will be repeated to construct the body
 * @param {number} energyLimit - The maximum amount of energy available in this room for spawning
 * @param {number} minParts - The minimum amount of parts required for spawning
 * @param {number} maxParts - The maximum allowed parts in the creep body
 * @returns {BodyPartConstant[]} - The full body part array used for spawning
 */
function genericBodyFunction(bodyTemplate: BodyPartConstant[], energyLimit: number, minParts: number, maxParts: number = MAX_CREEP_SIZE): BodyPartConstant[] {
    const energyPerRound: number = _.sum(bodyTemplate, (part: BodyPartConstant) => BODYPART_COST[part]);
    const partsPerRound: number = bodyTemplate.length;

    let body: BodyPartConstant[] = [];
    if(energyLimit < energyPerRound) {
        let costSoFar = 0;
        while(costSoFar + BODYPART_COST[bodyTemplate[body.length]] <= energyLimit) {
            costSoFar += BODYPART_COST[bodyTemplate[body.length]];
            body.push(bodyTemplate[body.length]);
        }

        return body.length >= minParts ? body : [];
    }

    const partNumber: number = Math.min(Math.floor(energyLimit / energyPerRound), Math.floor(maxParts / partsPerRound));
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
        return genericBodyFunction([MOVE, WORK, WORK, WORK], energyLimit, /*minParts=*/3);
    },

    'miner': (energyLimit: number) => {
        return genericBodyFunction([MOVE, WORK, WORK, WORK, WORK], energyLimit, /*minParts=*/5);
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
