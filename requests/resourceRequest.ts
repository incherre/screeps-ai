import { TransportManager } from "../managers/transportManager";
import { ScreepsRequest } from "./request";

export class ResourceRequest extends ScreepsRequest {
    public resourceType: ResourceConstant;
    public container: Structure | Creep;

    public getType(): string {
        return TransportManager.type;
    }

    constructor (requester: string, resourceType: ResourceConstant, container: Structure | Creep) {
        super();
        this.requester = requester;
        this.resourceType = resourceType;
        this.container = container;
    }
}