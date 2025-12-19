import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedOperationStep } from './ISerializedOperationStep';
import { ISerializedConnector } from './ISerializedConnector';
import { ConnectType } from '../../types/elements/ConnectType';
import { ISerializedAction } from './ISerializedAction';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';

export interface ISerializedActivity {
    id: string;
    name: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    capacity: number;
    inboundQueueCapacity: number;
    outboundQueueCapacity: number;

    // New action-based system
    actions?: ISerializedAction[];
    sourceConfig?: ISerializedEntitySourceConfig;

    // Legacy fields (deprecated, for backward compatibility)
    operationSteps: ISerializedOperationStep[];
    connectors: ISerializedConnector[];
    financialProperties?: any;
    preProcessingStateModifications?: any[];
    postProcessingStateModifications?: any[];

    connectType?: ConnectType;
}