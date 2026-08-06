import { PeriodUnit } from '@quodsi/shared';
import { SimulationTimeType } from '@quodsi/shared';
import { ScenarioLever } from '@quodsi/shared';
import { ISerializedEntity } from './ISerializedEntity';
import { ISerializedActivity } from './ISerializedActivity';
import { ISerializedResource } from './ISerializedResource';
import { ISerializedGenerator } from './ISerializedGenerator';
import { ISerializedResourceRequirement } from './ISerializedResourceRequirement';
import { ISerializedState } from './ISerializedState';
import { ISerializedTimePattern } from './ISerializedTimePattern';
import { ISerializedTimeDistributedConfig } from './ISerializedTimeDistributedConfig';
import { ISerializedScenarioChangeRequest } from './ISerializedScenarioChangeRequest';
import { ISerializedScenario } from './ISerializedScenario';

export interface ISerializedMetadata {
    /** Model-definition schema version the model was written under (MODEL_SCHEMA_VERSION). */
    version: string;
    timestamp: string;
}

export interface ISerializedModel {
    /** Model-document schema version (top-level stamp; spec 2026-08-06). */
    schemaVersion: string;
    metadata: ISerializedMetadata;
    model: {
        id: string;
        name: string;
        description?: string;
        reps: number;
        seed?: number;
        oneClockUnit?: PeriodUnit;
        simulationTimeType?: SimulationTimeType;
        warmupClockPeriod?: number;
        warmupClockPeriodUnit?: PeriodUnit;
        runClockPeriod?: number;
        runClockPeriodUnit?: PeriodUnit;
        warmupDateTime: string | null;
        startDateTime: string | null;
        finishDateTime: string | null;
        // Opt-in model-level levers (reps/seed). Conditionally included so
        // lever-less models produce no churn.
        levers?: ScenarioLever[];
    };
    entities: ISerializedEntity[];
    activities: ISerializedActivity[];
    resources: ISerializedResource[];
    generators: ISerializedGenerator[];
    resourceRequirements: ISerializedResourceRequirement[];
    states: ISerializedState[];
    timePatterns?: ISerializedTimePattern[];
    timeDistributedConfigs?: ISerializedTimeDistributedConfig[];
    scenarios?: ISerializedScenario[];
    scenarioChangeRequests?: ISerializedScenarioChangeRequest[];
}
