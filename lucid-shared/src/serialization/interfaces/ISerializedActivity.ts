import { ConnectType, ScenarioLever, QueueRanking } from '@quodsi/shared';
import { ISerializedAction } from './ISerializedAction';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';

/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against `CleanActivityDoc`
 * (engine `document/clean/routing.py`) — no `type` class-tag;
 * `inboundQueueCapacity`/`outboundQueueCapacity` renamed to
 * `inboundCapacity`/`outboundCapacity`; `connectType` renamed to `routing`;
 * `sourceConfig` shares its field set with `Generator` via
 * `ISerializedEntitySourceConfig`. `capacity`/`inboundCapacity`/
 * `outboundCapacity`/`routing`/`actions`/`levers`/`x`/`y` are all
 * sparse-omitted at their schema default by `Activity.toJSON()`.
 * `width`/`height` DO have a slot on `CleanActivityDoc` (unlike Generator/
 * Entity) — carried through, optional.
 */
export interface ISerializedActivity {
    id: string;
    name: string;
    description?: string;
    x?: number;
    y?: number;
    width?: number;   // Path X-lite: SVG userSpace shape size; absent for legacy models
    height?: number;
    capacity?: number;
    inboundCapacity?: number;
    outboundCapacity?: number;
    routing?: ConnectType;

    // Action-based system
    actions?: ISerializedAction[];
    sourceConfig?: ISerializedEntitySourceConfig;

    financialProperties?: any;
    failureProperties?: any;

    // Queue-ranking rule (engine 2026-08-08). Conditional inclusion — absent
    // means FIFO; models without it stay byte-identical.
    queueRanking?: QueueRanking;

    // Scenario-lever authoring metadata; only present when the component declares
    // levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}
