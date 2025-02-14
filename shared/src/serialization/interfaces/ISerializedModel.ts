import { PeriodUnit } from '../../types/elements/PeriodUnit';
import { SimulationTimeType } from '../../types/elements/SimulationTimeType';
import { ISerializedEntity } from './ISerializedEntity';
import { ISerializedActivity } from './ISerializedActivity';
import { ISerializedResource } from './ISerializedResource';
import { ISerializedGenerator } from './ISerializedGenerator';
import { ISerializedResourceRequirement } from './ISerializedResourceRequirement';

export interface ISerializedMetadata {
    version: string;
    timestamp: string;
}

export interface ISerializedModel {
    metadata: ISerializedMetadata;
    model: {
        id: string;
        name: string;
        reps: number;
        forecastDays: number;
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
    };
    entities: ISerializedEntity[];
    activities: ISerializedActivity[];
    resources: ISerializedResource[];
    generators: ISerializedGenerator[];
    resourceRequirements: ISerializedResourceRequirement[];
}
