abstract class Manager {
    public parent: Colony;
    public workers: Worker[];
    public buildings: Structure[];

    public abstract manage(): void;

    constructor (parent: Colony) {
        this.parent = parent;
        this.workers = []
        this.buildings = []
    }
}
