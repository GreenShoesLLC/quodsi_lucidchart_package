import { SimulationObjectType } from "./enums/simulationObjectType";
import { OperationStep } from "./operationStep";
import { ConnectType } from "./enums/connectType";
export declare class Connector {
    id: string;
    name: string;
    probability: number;
    connectType: ConnectType;
    operationSteps: OperationStep[];
    type: SimulationObjectType;
    constructor(id: string, name: string, probability?: number, connectType?: ConnectType, operationSteps?: OperationStep[]);
}
