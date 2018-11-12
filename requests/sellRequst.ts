import { EmpireRequest } from "./empireRequest";

export class SellRequest extends EmpireRequest {
    public static type = 'sell';

    public resourceType: ResourceConstant;
    public amount: number;

    public getType(): string {
        return SellRequest.type;
    }

    constructor(roomName: string, amount: number, resourceType: ResourceConstant) {
        super(roomName);
        this.amount = amount;
        this.resourceType = resourceType;
    }
}
