import { ScreepsRequest } from "./request";

export class DropoffRequest extends ScreepsRequest {
    public static type = 'dropoff'
    public resourceType: ResourceConstant;
    public container: Structure | Creep;

    public getType(): string {
        return DropoffRequest.type;
    }

    constructor (requester: string, container: Structure | Creep, resourceType: ResourceConstant = RESOURCE_ENERGY) {
        super();
        this.requester = requester;
        this.resourceType = resourceType;
        this.container = container;
    }
}