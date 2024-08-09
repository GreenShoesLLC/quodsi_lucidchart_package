import { SimulationObjectType } from './enums';
import { PeriodUnit } from './enums/PeriodUnit';
import { SimulationTimeType } from './enums/simulation_time_type';
import { SimulationObject } from './simulation_object';
export interface Model extends SimulationObject {
    reps: number;
    forecastDays: number;
    type: SimulationObjectType.Model;
    seed?: number;
    oneClockUnit?: PeriodUnit;
    simulationTimeType?: SimulationTimeType;
    warmupClockPeriod?: number;
    warmupClockPeriodUnit?: PeriodUnit;
    runClockPeriod?: number;
    runClockPeriodUnit?: PeriodUnit;
    warmupDateTime?: Date | null;
    startDateTime?: Date | null;
    finishDateTime?: Date | null;
}
