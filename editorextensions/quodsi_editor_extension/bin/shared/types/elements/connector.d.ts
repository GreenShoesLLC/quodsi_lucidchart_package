import { SimulationObjectType } from "./enums/simulationObjectType";
import { OperationStep } from "./operationStep";
import { ConnectType } from "./enums/connectType";
import { SimulationObject } from "./simulation_object";
export declare class Connector implements SimulationObject {
    id: string;
    name: string;
    probability: number;
    connectType: ConnectType;
    operationSteps: OperationStep[];
    type: SimulationObjectType;
    constructor(id: string, name: string, probability?: number, connectType?: ConnectType, operationSteps?: OperationStep[]);
}
