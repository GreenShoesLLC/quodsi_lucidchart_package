import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ConnectType } from '../../types/elements/ConnectType';
import { ISerializedOperationStep } from './ISerializedOperationStep';

export interface ISerializedConnector {
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    type: SimulationObjectType;
    probability: number;
    connectType: ConnectType;
    operationSteps: ISerializedOperationStep[];
}