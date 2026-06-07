import { SimulationObjectType } from "./SimulationObjectType";
import { PositionedSimulationObject } from "./PositionedSimulationObject";
import { ResourceFinancialProperties } from "./FinancialProperties";
export declare class Resource extends PositionedSimulationObject {
    id: string;
    name: string;
    capacity: number;
    type: SimulationObjectType;
    /**
     * Financial properties for Phase 1 costing
     */
    financialProperties?: ResourceFinancialProperties;
    static createDefault(id: string, x?: number, y?: number): Resource;
    description: string;
    constructor(id: string, name: string, capacity?: number, x?: number, y?: number);
}
//# sourceMappingURL=Resource.d.ts.map