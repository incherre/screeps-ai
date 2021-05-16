import { ScreepsRequest } from "requests/request";
import { Empire } from "../empire";
import { WorkerCreep } from "../worker";

export abstract class EmpireManager {
    public parent: Empire;
    public workers: WorkerCreep[];

    public tickInit(): void {
        // Remove invalid workers.
        let i = 0;
        while(i < this.workers.length) {
            if(!Game.getObjectById(this.workers[i].creepId)) {
                // Remove from unsorted list in constant time.
                this.workers[i] = this.workers[this.workers.length - 1];
                this.workers.pop();
            }
            else {
                i++;
            }
        }

        for(const worker of this.workers) {
            worker.tickInit();
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

    constructor (parent: Empire) {
        this.parent = parent;
        this.workers = [];
    }
}
