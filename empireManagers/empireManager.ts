import { Empire } from "../empire";
import { EmpireRequest } from "../requests/empireRequest";

export abstract class EmpireManager {
    public parent: Empire;

    public abstract generateRequests(): EmpireRequest[]; 
    public abstract manage(): void;

    constructor (parent: Empire) {
        this.parent = parent;
    }
}
