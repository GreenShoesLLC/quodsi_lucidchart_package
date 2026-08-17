import { GeneratorType } from '@quodsi/shared';
import { ISerializedDuration } from './ISerializedDuration';

/**
 * Wire-cleanup Phase B2 Task 9: `EntitySourceConfig` was DISSOLVED (Task 5) —
 * there is no longer a nested `generationConfig`/`sourceConfig` wrapper type
 * in `@quodsi/shared`; the "generator core" field set now lives flat on
 * `Generator` itself and nested (but with the SAME field names) under
 * `Activity.sourceConfig` (see `@quodsi/shared`'s `SourceConfig` interface
 * and `generatorCoreEntries()`, which both `Generator.toJSON()` and
 * `Activity.toJSON()` share for omission rules).
 *
 * This interface is kept (file name unchanged to minimize import churn) as
 * the WIRE shape of that shared field set — used directly by
 * `ISerializedActivity.sourceConfig` (nested) and spread flat onto
 * `ISerializedGenerator` (see that file). Mode-scoped per the engine's
 * `_mode_scoped` validator: FREQUENCY (`interarrivalTime`/`batchSize`/
 * `startDelay`/`maxCycles`), PATTERN (`arrivalPatternId`/`volume`),
 * SCHEDULED (`arrivalScheduleId`), unscoped (`entityId`/`mode`/
 * `maxEntities`/`initialStates`).
 */
export interface ISerializedEntitySourceConfig {
    entityId: string;
    mode?: GeneratorType;

    // FREQUENCY mode fields
    interarrivalTime?: ISerializedDuration;
    batchSize?: number;
    startDelay?: ISerializedDuration;
    maxCycles?: number;

    // PATTERN mode fields. Lucid has no Pattern editor of its own (see
    // GeneratorEditor.tsx's read-only notice), but a generator authored as
    // PATTERN in Studio or drawio must still round-trip these losslessly
    // through Lucid.
    arrivalPatternId?: string;
    volume?: number;

    // SCHEDULED mode fields
    arrivalScheduleId?: string;

    // Common fields (any mode)
    maxEntities?: number;
    initialStates?: any[]; // StateModification[] (already-serialized JSON)
}
