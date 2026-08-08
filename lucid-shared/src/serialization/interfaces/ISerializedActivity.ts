import { SimulationObjectType, ScenarioLever, QueueRanking } from '@quodsi/shared';
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

    financialProperties?: any;
    failureProperties?: any;

    connectType?: ConnectType;

    // Queue-ranking rule (engine 2026-08-08). Conditional inclusion — absent
    // means FIFO; models without it stay byte-identical.
    queueRanking?: QueueRanking;

    // Scenario-lever authoring metadata; only present when the component declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}