import { removeAt } from "misc/arrayFunctions";
import { Colony } from "../colony";
import { ScreepsRequest } from "../requests/request";
import { WorkerCreep } from "../worker";

export abstract class Manager {
    public parent: Colony;
    public workers: WorkerCreep[];

    public tickInit(): void {
        // remove any workers with dead creeps
        let i = 0;
        while(i < this.workers.length) {
            if(!Game.getObjectById(this.workers[i].creepId)) {
                // move the last one to here and pop
                removeAt(this.workers, i);
            }
            else {
                i++;
            }
        }
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
