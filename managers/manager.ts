import { Colony } from "../colony";
import { ScreepsRequest } from "../requests/request";
import { WorkerCreep } from "../worker";

export abstract class Manager {
    public parent: Colony;
    public workers: WorkerCreep[];

    public tickInit(): void {
        // default is do nothing
        return;
    }
    public abstract generateRequests(): ScreepsRequest[]; 
    public abstract manage(): void;
    public cleanup(): void {
        // default is nothing to clean
        return;
    }

    public addWorker(newWorker: WorkerCreep): void {
        this.workers.push(newWorker);
    }

    constructor (parent: Colony) {
        this.parent = parent;
        this.workers = [];
    }
}
