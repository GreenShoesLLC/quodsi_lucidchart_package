import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedOperationStep } from './ISerializedOperationStep';
import { ISerializedConnector } from './ISerializedConnector';
import { ConnectType } from '../../types/elements/ConnectType';

export interface ISerializedActivity {
    id: string;
    name: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: ISerializedOperationStep[];
    connectors: ISerializedConnector[];
    financialProperties?: any;
    preProcessingStateModifications?: any[];
    postProcessingStateModifications?: any[];
    connectType?: ConnectType;
}