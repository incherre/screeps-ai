import { ScreepsRequest } from "./request";

export class PickupRequest extends ScreepsRequest {
    public static type = 'pickup'
    public resourceType: ResourceConstant;
    public container: AnyStoreStructure | Resource | Tombstone | Ruin;

    public getType(): string {
        return PickupRequest.type;
    }

    constructor (requester: string, container: AnyStoreStructure | Resource | Tombstone | Ruin, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        this.requester = requester;
        this.resourceType = resourceType;
        this.container = container;
    }
}
