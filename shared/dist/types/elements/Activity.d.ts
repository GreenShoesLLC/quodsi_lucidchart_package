import { SimulationObjectType } from "./SimulationObjectType";
import { OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";
export declare class Activity implements SimulationObject {
    id: string;
    name: string;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: OperationStep[];
    type: SimulationObjectType;
    static createDefault(id: string): Activity;
    constructor(id: string, name: string, capacity?: number, inputBufferCapacity?: number, outputBufferCapacity?: number, operationSteps?: OperationStep[]);
}
//# sourceMappingURL=Activity.d.ts.map