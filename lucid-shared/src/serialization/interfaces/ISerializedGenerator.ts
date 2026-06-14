import { SimulationObjectType, ScenarioLever } from '@quodsi/shared';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';

export interface ISerializedGenerator {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;   // Path X-lite: SVG userSpace shape size; absent for legacy models
    height?: number;

    // Required configuration
    generationConfig: ISerializedEntitySourceConfig;

    // Optional exit destination (activity ID)
    exitConnector?: string;

    // Scenario-lever authoring metadata; only present when the component declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}
