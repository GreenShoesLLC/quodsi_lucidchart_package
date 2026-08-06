import { SimulationObjectType, ScenarioLever } from '@quodsi/shared';
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
    destinationPriority?: number;

    // Canonical destination (effective destinationUniqueId ?? legacy targetId).
    targetId: string;

    // Routing condition fields
    entityTemplateUniqueId?: string;
    stateCondition?: any;
    stateModifications?: any[];

    // Scenario-lever authoring metadata; only present when the connector declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}