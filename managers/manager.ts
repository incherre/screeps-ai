import { Colony } from "../colony";
import { ScreepsRequest } from "../requests/request";
import { WorkerCreep } from "../worker";

export abstract class Manager {
    public parent: Colony;
    public workers: WorkerCreep[];

    public abstract generateRequests(): ScreepsRequest[]; 
    public abstract manage(): void;

    constructor (parent: Colony) {
        this.parent = parent;
        this.workers = [];
    }
}
