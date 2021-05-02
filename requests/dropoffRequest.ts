import { ScreepsRequest } from "./request";

export class DropoffRequest extends ScreepsRequest {
    public static type = 'dropoff'
    public resourceType: ResourceConstant;
    public container: AnyStoreStructure | Creep;

    public getType(): string {
        return DropoffRequest.type;
    }

    constructor (requester: string, container: AnyStoreStructure | Creep, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        this.requester = requester;
        this.resourceType = resourceType;
        this.container = container;
    }
}
