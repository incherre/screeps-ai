/**
 * Abstract base class representing a request from one manager to another.
 * @property {string} requester - The identifier of the manager which generated this request
 * @property {number} priority - The priority of the request
 * priorities:
 * 0 => Do this NOW, no questions asked
 * 1 => Extremely important, probably related to defense
 * 2 => Elevated importance, probably related to economy / harvesting
 * 3 => Normal operation
 * 4+ => "Eh, if you have time"
 */
export abstract class ScreepsRequest {
    public requester: string;
    public priority: number;

    /**
     * Returns the string identifier of the type of request it is.
     */
    public abstract getType(): string;

    constructor (requester: string, priority: number) {
        this.requester = requester;
        this.priority = priority;
    }
}
