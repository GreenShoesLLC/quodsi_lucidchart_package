import { PeriodUnit } from '@quodsi/shared';
import { SimulationTimeType } from '@quodsi/shared';
import { ScenarioLever } from '@quodsi/shared';
import { ISerializedEntity } from './ISerializedEntity';
import { ISerializedActivity } from './ISerializedActivity';
import { ISerializedResource } from './ISerializedResource';
import { ISerializedGenerator } from './ISerializedGenerator';
import { ISerializedConnector } from './ISerializedConnector';
import { ISerializedResourceRequirement } from './ISerializedResourceRequirement';
import { ISerializedState } from './ISerializedState';
import { ISerializedDuration } from './ISerializedDuration';
import { ISerializedScenarioChangeRequest } from './ISerializedScenarioChangeRequest';
import { ISerializedScenario } from './ISerializedScenario';
import { ISerializedArrivalPattern } from './ISerializedArrivalPattern';
import { ISerializedArrivalSchedule } from './ISerializedArrivalSchedule';

export interface ISerializedMetadata {
    /** Model-definition schema version the model was written under (MODEL_SCHEMA_VERSION). */
    version: string;
    timestamp: string;
}

/**
 * Wire-cleanup Phase B2 Task 9: `CleanModelDocument` (engine `document/
 * clean/root.py`) puts the model's run parameters FLAT ON THE DOCUMENT
 * ROOT — the old layer's nested `model: {...}` sub-block is RETIRED, not
 * merely renamed (see that module's own docstring: "Run parameters are FLAT
 * on the root — the old `ModelBlockDoc` wrapper is retired"). Ground-truthed
 * against both golden fixtures (`wide_grammar_clean.json`/
 * `scaffold_clean.json`), whose top-level keys are exactly
 * `schemaVersion`/`name`/`replications`/`seed`/`timeUnit`/`timeMode`/
 * `startDateTime`/`runTime`/`warmupTime`/`description`/`levers`/`entities`/
 * `states`/`resources`/`resourceRequirements`/`activities`/`generators`/
 * `arrivalPatterns`/`arrivalSchedules`/`connectors` — no `model` key
 * anywhere. `model.id` (round-trip-only Lucid document id) has **no
 * clean-wire equivalent at all** — dropped entirely, not renamed (per the
 * engine doc's explicit note to translators). `replications`/`timeUnit`/
 * `runTime` are required, never omitted (the SERIALIZER — not
 * `Model.toJSON()`, which only ever omits `undefined` — is responsible for
 * containment: always materializing these three before this shape is
 * built). `metadata` (Lucid's own `{version, timestamp}` stamp) rides the
 * document's loose-passthrough `metadata: Optional[dict]` field, untouched
 * by the engine reader.
 */
export interface ISerializedModel {
    /** Model-document schema version (top-level stamp; spec 2026-08-06). */
    schemaVersion: string;
    metadata: ISerializedMetadata;

    name: string;
    description?: string;
    replications: number;
    seed?: number;
    timeUnit: PeriodUnit;
    timeMode?: SimulationTimeType;
    runTime: ISerializedDuration;
    warmupTime?: ISerializedDuration;
    startDateTime?: string | null;
    // Opt-in model-level levers (reps/seed). Conditionally included so
    // lever-less models produce no churn.
    levers?: ScenarioLever[];

    entities: ISerializedEntity[];
    activities: ISerializedActivity[];
    resources: ISerializedResource[];
    generators: ISerializedGenerator[];
    connectors: ISerializedConnector[];
    resourceRequirements: ISerializedResourceRequirement[];
    states: ISerializedState[];
    scenarios?: ISerializedScenario[];
    /** Model-level pattern list. Sparse-omitted when empty, like `scenarios`. */
    arrivalPatterns?: ISerializedArrivalPattern[];
    /** Model-level schedule list. Sparse-omitted when empty, like `arrivalPatterns`. */
    arrivalSchedules?: ISerializedArrivalSchedule[];
    scenarioChangeRequests?: ISerializedScenarioChangeRequest[];
}
