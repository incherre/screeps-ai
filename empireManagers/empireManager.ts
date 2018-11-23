import { Empire } from "../empire";
import { EmpireRequest } from "../requests/empireRequest";
import { WorkerCreep } from "../worker";

export abstract class EmpireManager {
    public parent: Empire;
    public workers: WorkerCreep[];

    public tickInit(): void {
        // default is do nothing
        return;
    }
    public abstract generateRequests(): EmpireRequest[];
    public abstract manage(): void;
    public cleanup(): void {
        // default is nothing to clean
        return;
    }

    public addWorker(newWorker: WorkerCreep): void {
        this.workers.push(newWorker);
    }

    constructor (parent: Empire) {
        this.parent = parent;
        this.workers = [];
    }
}
