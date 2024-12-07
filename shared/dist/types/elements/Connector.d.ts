import { SimulationObjectType } from "./SimulationObjectType";
import { ConnectType } from "./ConnectType";
import { OperationStep } from "./OperationStep";
import { SimulationObject } from "./SimulationObject";
export declare class Connector implements SimulationObject {
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    probability: number;
    connectType: ConnectType;
    operationSteps: OperationStep[];
    type: SimulationObjectType;
    constructor(id: string, name: string, sourceId: string, targetId: string, probability?: number, connectType?: ConnectType, operationSteps?: OperationStep[]);
}
//# sourceMappingURL=Connector.d.ts.map