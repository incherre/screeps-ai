import { ScreepsRequest } from "./request";

/**
 * A request for resources to be picked up from a specific container.
 * @property {ResourceConstant} resourceType - The type of resource to pick up
 * @property {AnyStoreStructure | Resource | Tombstone | Ruin} container - The container to withdraw the resource from
 * @property {number} amount - The amount of resources to be picked up
 */
export class PickupRequest extends ScreepsRequest {
    public static type = 'pickup'
    public resourceType: ResourceConstant;
    public container: AnyStoreStructure | Resource | Tombstone | Ruin;
    public amount: number;

    public getType(): string {
        return PickupRequest.type;
    }

    constructor (requester: string, container: AnyStoreStructure | Resource | Tombstone | Ruin, amount: number,
        resourceType: ResourceConstant = RESOURCE_ENERGY, priority: number = 3) {
        super(requester, priority);
        this.amount = amount;
        this.resourceType = resourceType;
        this.container = container;
    }
}
