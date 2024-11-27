import { SimulationObjectType } from "./enums/simulationObjectType";
import { OperationStep } from "./operationStep";
import { SimulationObject } from "./simulation_object";
export declare class Activity implements SimulationObject {
    id: string;
    name: string;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: OperationStep[];
    type: SimulationObjectType;
    constructor(id: string, name: string, capacity?: number, inputBufferCapacity?: number, outputBufferCapacity?: number, operationSteps?: OperationStep[]);
}
