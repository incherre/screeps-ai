import { ScreepsRequest } from "./request";

/**
 * A request for resources to be picked up from a specific container.
 * @property {ResourceConstant} resourceType - The type of resource to pick up
 * @property {AnyStoreStructure | Resource | Tombstone | Ruin} container - The container to withdraw the resource from
 */
export class PickupRequest extends ScreepsRequest {
    public static type = 'pickup'
    public resourceType: ResourceConstant;
    public container: AnyStoreStructure | Resource | Tombstone | Ruin;

    public getType(): string {
        return PickupRequest.type;
    }

    constructor (requester: string, container: AnyStoreStructure | Resource | Tombstone | Ruin, resourceType: ResourceConstant = RESOURCE_ENERGY, priority: number = 3) {
        super(requester, priority);
        this.resourceType = resourceType;
        this.container = container;
    }
}
