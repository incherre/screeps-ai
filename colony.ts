class Colony {
    public capital: Room;
    public farms: Room[];
    public managers: Manager[];
    public requests: Request[];
    
    public getRequests(type: string): Request[] {
        return []; // TODO(Daniel): implement
    }

    public addRequest(request: Request): void {
        return; // TODO(Daniel): implement
    }

    public run(): void{
        for(const manager in this.managers) {
            this.managers[manager].manage();
        }
    }

    constructor (capital: Room) {
        this.capital = capital;

        this.farms = []; // TODO(Daniel): check neighboring rooms to see if they are being used
        this.managers = [];
        this.requests = []; // TODO(Daniel): find any requests from last tick that haven't expired
    }
}
