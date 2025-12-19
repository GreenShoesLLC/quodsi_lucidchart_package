import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedOperationStep } from './ISerializedOperationStep';
import { ISerializedAction } from './ISerializedAction';

export interface ISerializedConnector {
    id: string;
    name: string;
    type: SimulationObjectType;
    sourceId: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    x: number;  // Midpoint x
    y: number;  // Midpoint y
    weight: number;

    // New fields
    actions?: ISerializedAction[];
    destinationUniqueId?: string;
    destinationPriority?: number;

    // Legacy fields (deprecated, for backward compatibility)
    targetId: string;
    operationSteps: ISerializedOperationStep[];

    // Routing condition fields
    entityTemplateUniqueId?: string;
    stateCondition?: any;
    stateModifications?: any[];
}