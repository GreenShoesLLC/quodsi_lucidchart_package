import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ConnectType } from '../../types/elements/ConnectType';
import { ISerializedOperationStep } from './ISerializedOperationStep';

export interface ISerializedConnector {
    id: string;
    name: string;
    type: SimulationObjectType;
    sourceId: string;
    targetId: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    x: number;  // Midpoint x
    y: number;  // Midpoint y
    probability: number;
    connectType: ConnectType;
    operationSteps: ISerializedOperationStep[];
}