import { ConnectType, ScenarioLever } from '@quodsi/shared';
import { ISerializedEntitySourceConfig } from './ISerializedEntitySourceConfig';

/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against `CleanGeneratorDoc`
 * (engine `document/clean/routing.py`) — FLAT (no `generationConfig`
 * wrapper, dissolved at Task 5), no `type` class-tag. Shares its core-field
 * set with `ISerializedEntitySourceConfig` (mode-scoped generator-core
 * fields: `entityId`/`mode`/`interarrivalTime`/`batchSize`/`startDelay`/
 * `maxCycles`/`arrivalPatternId`/`volume`/`arrivalScheduleId`/`maxEntities`/
 * `initialStates`) — extended rather than nested. `routing@probability`
 * sparse-omitted. `width`/`height` have NO slot at all on the clean wire
 * (unlike `Activity`/`Resource`) — dropped unconditionally, never emitted.
 */
export interface ISerializedGenerator extends ISerializedEntitySourceConfig {
    id: string;
    name: string;
    description?: string;
    x?: number;
    y?: number;
    routing?: ConnectType;

    // Scenario-lever authoring metadata; only present when the component
    // declares levers (conditional inclusion => no churn for lever-less models).
    levers?: ScenarioLever[];
}
