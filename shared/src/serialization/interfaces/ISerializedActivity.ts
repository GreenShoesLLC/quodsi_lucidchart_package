import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedOperationStep } from './ISerializedOperationStep';
import { ISerializedConnector } from './ISerializedConnector';

export interface ISerializedActivity {
    id: string;
    name: string;
    type: SimulationObjectType;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: ISerializedOperationStep[];
    connectors: ISerializedConnector[];
}
