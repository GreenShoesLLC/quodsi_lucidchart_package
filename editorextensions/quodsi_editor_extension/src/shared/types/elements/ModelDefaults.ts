import { PeriodUnit } from "./PeriodUnit";
import { SimulationTimeType } from "./SimulationTimeType";

export namespace ModelDefaults {
    export const DEFAULT_SEED = 12345;
    export const DEFAULT_CLOCK_UNIT = PeriodUnit.MINUTES;
    export const DEFAULT_SIMULATION_TIME_TYPE = SimulationTimeType.Clock;
    export const DEFAULT_WARMUP_PERIOD = 0.0;
    export const DEFAULT_RUN_PERIOD = 0.0;
    export const DEFAULT_REPS = 1;
    export const DEFAULT_FORECAST_DAYS = 30;
}