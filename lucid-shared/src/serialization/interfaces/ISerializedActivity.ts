import { SimulationObjectType, ScenarioLever } from '@quodsi/shared';
import { ISerializedConnector } from './ISerializedConnector';
import { ConnectType } from '@quodsi/shared';
import { ISerializedAction } from './ISerializedAction';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';

export interface ISerializedActivity {
    id: string;
    name: string;
    description?: string;
    type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;   // Path X-lite: SVG userSpace shape size; absent for legacy models
    height?: number;
    capacity: number;
    inboundQueueCapacity: number;
    outboundQueueCapacity: number;

    // Action-based system
    actions: ISerializedAction[];
    sourceConfig?: ISerializedEntitySourceConfig;

    connectors: ISerializedConnector[];
    financialProperties?: any;
    failureProperties?: any;

    connectType?: ConnectType;

    // Scenario-lever authoring metadata; only present when the component declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}