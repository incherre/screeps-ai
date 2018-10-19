import { ScreepsRequest } from "./request";

export class ResourceRequest extends ScreepsRequest {
    public static type = 'dropoff'
    public resourceType: ResourceConstant;
    public container: Structure | Creep;

    public getType(): string {
        return ResourceRequest.type;
    }

    constructor (requester: string, resourceType: ResourceConstant, container: Structure | Creep) {
        super();
        this.requester = requester;
        this.resourceType = resourceType;
        this.container = container;
    }
}