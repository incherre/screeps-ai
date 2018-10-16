export interface EnergyContainer {
    energy: number;
    energyCapacity: number;
}

export interface GeneralContainer {
    store: StoreDefinition;
    storeCapacity: number;
}

export interface CreepContainer {
    carry: StoreDefinition;
    carryCapacity: number;
}
