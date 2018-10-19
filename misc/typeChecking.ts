export interface EnergyContainer {
    energy: number;
    energyCapacity: number;
}

export interface GeneralContainer {
    store: StoreDefinition;
    storeCapacity: number;
}

export interface Ownable {
    my: boolean;
}