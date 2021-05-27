/**
 * The in-game owner of NPC Source Keepers.
 */
export const SOURCE_KEEPER_NAME: string = 'Source Keeper';

/**
 * The range at which source keepers will start to attack a creep.
 */
export const SOURCE_KEEPER_ATTACK_RANGE: number = 3;

/**
 * The in-game owner of NPC Invaders.
 */
export const INVADER_NAME: string = 'Invader'

function _getOwnName(): string {
    if(Memory.username) {
        return Memory.username;
    }
    else {
        const struct = _.find(Game.structures,
            (structure: Structure) => structure instanceof OwnedStructure && (structure as OwnedStructure).my
            ) as OwnedStructure;
        if(struct && struct.my && struct.owner) {
            Memory.username = struct.owner.username;
            return Memory.username;
        }
        else {
            const creep = _.find(Game.creeps);
            if(creep && creep.my) {
                Memory.username = creep.owner.username;
                return Memory.username;
            }
            else {
                return '';
            }
        }
    }
}

/**
 * The username of the account running the script.
 */
export const OWN_NAME: string = _getOwnName();

function _getInvertedReactionMap(): Map<ResourceConstant, [ResourceConstant, ResourceConstant]> {
    const invertedReactionMap = new Map<ResourceConstant, [ResourceConstant, ResourceConstant]>();

    for(const firstComponent in REACTIONS) {
        for(const secondComponent in REACTIONS[firstComponent]) {
            const result = REACTIONS[firstComponent][secondComponent];
            if(!invertedReactionMap.has(result as ResourceConstant)) {
                invertedReactionMap.set(result as ResourceConstant, [firstComponent as ResourceConstant, secondComponent as ResourceConstant]);
            }
        }
    }

    return invertedReactionMap;
}

/**
 * A map of (lab product) => (required components).
 */
export const INVERTED_REACTIONS: Map<ResourceConstant, [ResourceConstant, ResourceConstant]> = _getInvertedReactionMap();

/**
 * The width/height of a room.
 */
export const ROOM_SIZE: number = 50;
