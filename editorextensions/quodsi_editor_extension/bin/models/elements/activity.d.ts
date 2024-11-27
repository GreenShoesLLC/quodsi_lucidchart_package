import { SimulationObjectType } from "./enums/simulationObjectType";
import { OperationStep } from "./operationStep";
export declare class Activity {
    id: string;
    name: string;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: OperationStep[];
    type: SimulationObjectType;
    constructor(id: string, name: string, capacity?: number, inputBufferCapacity?: number, outputBufferCapacity?: number, operationSteps?: OperationStep[]);
}
