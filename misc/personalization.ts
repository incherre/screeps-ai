/**
 * An array of messages to choose randomly when signing controllers, should be 100 characters or less.
 */
export const signs: string[] = [
    "This is a sign by me, the signer. Signed: ",
];

/**
 * An array of names to choose randomly when naming creeps.
 */
const names: string[] = [
    "John",
];

/**
 * An array of suffixes for creep names to help prevent conflicts.
 */
const suffixes: string[] = [
    '',
    'II',
    'III',
    'IV',
    'V',
];

/**
 * Constructs a name for a new creep.
 * @param {string} lastName - The last name to use, usually a spawn name.
 * @returns {string} - The name to use for the new creep.
 */
export function getNewCreepName(lastName: string): string {
    const startIndex = Math.floor(Math.random() * names.length);

    for(let indexOffset = 0; indexOffset < names.length; indexOffset++) {
        const index = (startIndex + indexOffset) % names.length;
        for(const suffix of suffixes) {
            const candidateName: string = (suffix ? [names[index], lastName, suffix] : [names[index], lastName]).join(' ');
            if(!Game.creeps[candidateName] && !Memory.creeps[candidateName]) {
                return candidateName;
            }
        }
    }

    console.log('Ran out of creep names!');
    return '';
}

/**
 * An array of "last names" to choose randomly when naming spawns.
 */
const spawnNames: string[] = [
    "Smith",
];

/**
 * Get a random name for a spawn.
 * @returns {string} - A random name from spawnNames that is currently unused.
 */
export function getNewSpawnName(): string {
    const startIndex = Math.floor(Math.random() * spawnNames.length);

    for(let indexOffset = 0; indexOffset < spawnNames.length; indexOffset++) {
        const index = (startIndex + indexOffset) % spawnNames.length;
        if(!Game.spawns[spawnNames[index]]) {
            return spawnNames[index];
        }
    }

    console.log('Ran out of spawn names!');
    return '';
}
