import { PeriodUnit } from "./PeriodUnit";
import { SimulationTimeType } from "./SimulationTimeType";
export declare namespace ModelDefaults {
    const DEFAULT_SEED = 12345;
    const DEFAULT_CLOCK_UNIT = PeriodUnit.MINUTES;
    const DEFAULT_SIMULATION_TIME_TYPE = SimulationTimeType.Clock;
    const DEFAULT_WARMUP_PERIOD = 0;
    const DEFAULT_RUN_PERIOD = 0;
    const DEFAULT_REPS = 1;
    const DEFAULT_FORECAST_DAYS = 30;
}
