import { SimulationObjectType } from './enums/simulationObjectType';
import { PeriodUnit } from './enums/PeriodUnit';
import { SimulationTimeType } from './enums/simulation_time_type';
import { SimulationObject } from './simulation_object';
declare global {
    interface Window {
        crypto: Crypto;
    }
}
export declare class Model implements SimulationObject {
    id: string;
    name: string;
    reps: number;
    forecastDays: number;
    seed?: number | undefined;
    oneClockUnit?: PeriodUnit | undefined;
    simulationTimeType?: SimulationTimeType | undefined;
    warmupClockPeriod?: number | undefined;
    warmupClockPeriodUnit?: PeriodUnit | undefined;
    runClockPeriod?: number | undefined;
    runClockPeriodUnit?: PeriodUnit | undefined;
    warmupDateTime: Date | null;
    startDateTime: Date | null;
    finishDateTime: Date | null;
    type: SimulationObjectType;
    constructor(id: string, name: string, reps: number, forecastDays: number, seed?: number | undefined, oneClockUnit?: PeriodUnit | undefined, simulationTimeType?: SimulationTimeType | undefined, warmupClockPeriod?: number | undefined, warmupClockPeriodUnit?: PeriodUnit | undefined, runClockPeriod?: number | undefined, runClockPeriodUnit?: PeriodUnit | undefined, warmupDateTime?: Date | null, startDateTime?: Date | null, finishDateTime?: Date | null);
}
export declare namespace ModelDefaults {
    const DEFAULT_SEED = 12345;
    const DEFAULT_CLOCK_UNIT = PeriodUnit.MINUTES;
    const DEFAULT_SIMULATION_TIME_TYPE = SimulationTimeType.Clock;
    const DEFAULT_WARMUP_PERIOD = 0;
    const DEFAULT_RUN_PERIOD = 0;
    const DEFAULT_REPS = 1;
    const DEFAULT_FORECAST_DAYS = 30;
}
export declare class ModelUtils {
    /**
     * Generates a UUID for the model
     */
    private static generateUUID;
    /**
     * Creates a new default model instance with a UUID
     */
    static createNew(name?: string): Model;
    /**
     * Creates a complete Model object with default values for all optional fields
     */
    static createWithDefaults(partialModel: Partial<Model>): Model;
    static validate(model: Model): Model;
    static isComplete(model: Partial<Model>): model is Model;
}
