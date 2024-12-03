import { SimulationObjectType } from "./SimulationObjectType";
import { OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";
import { Connector } from "./Connector";
export declare class Activity implements SimulationObject {
    id: string;
    name: string;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: OperationStep[];
    connectors: Connector[];
    type: SimulationObjectType;
    constructor(id: string, name: string, capacity?: number, inputBufferCapacity?: number, outputBufferCapacity?: number, operationSteps?: OperationStep[], connectors?: Connector[]);
}
