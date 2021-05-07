import { ScreepsRequest } from "./request";

/**
 * A request for resources to be dropped off into a specific container.
 * @property {ResourceConstant} resourceType - The type of resource to drop off
 * @property {AnyStoreStructure | Creep} container - The container or creep to drop off the resources into
 * @property {number} amount - The amount of resources being requested
 */
export class DropoffRequest extends ScreepsRequest {
    public static type = 'dropoff'
    public resourceType: ResourceConstant;
    public container: AnyStoreStructure | Creep;
    public amount: number;

    public getType(): string {
        return DropoffRequest.type;
    }

    constructor (requester: string, container: AnyStoreStructure | Creep, amount: number, resourceType: ResourceConstant = RESOURCE_ENERGY, priority: number = 3) {
        super(requester, priority);
        this.resourceType = resourceType;
        this.container = container;
        this.amount = amount;
    }
}
