class Worker {
    public creep: Creep;
    public job: Job;

    constructor (creep: Creep, job: Job) {
        this.creep = creep;
        this.job = job;
    }

    public work(): void {
        if(this.job.ttr <= 0) {
            this.job.recalculateTarget();
        }

        const creepPos = this.creep.pos;
        const targetPos = this.job.target;
        if(creepPos.x === targetPos.x && creepPos.y === targetPos.y && creepPos.roomName === targetPos.roomName) {
            this.job.do(this.creep);
        }
        else {
            this.creep.moveTo(new RoomPosition(targetPos.x, targetPos.y, targetPos.roomName));
        }
    }
}
