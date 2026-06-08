import { SimulationObjectType } from '@quodsi/shared';
import { ISerializedAction } from './ISerializedAction';

export interface ISerializedConnector {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    sourceId: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    x: number;  // Midpoint x
    y: number;  // Midpoint y
    weight: number;

    // Action-based system
    actions: ISerializedAction[];
    destinationUniqueId?: string;
    destinationPriority?: number;

    // Legacy field
    targetId: string;

    // Routing condition fields
    entityTemplateUniqueId?: string;
    stateCondition?: any;
    stateModifications?: any[];
}