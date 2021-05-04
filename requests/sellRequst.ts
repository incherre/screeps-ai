import { EmpireRequest } from "./empireRequest";

/**
 * Empire request to sell resources on the market.
 * @property {ResourceConstant} resourceType - The type of resources to sell
 * @property {number} amount - The amount to sell
 */
export class SellRequest extends EmpireRequest {
    public static type = 'sell';
    public resourceType: ResourceConstant;
    public amount: number;

    public getType(): string {
        return SellRequest.type;
    }

    constructor(roomName: string, amount: number, resourceType: ResourceConstant, priority: number = 3) {
        super(roomName, priority);
        this.amount = amount;
        this.resourceType = resourceType;
    }
}
