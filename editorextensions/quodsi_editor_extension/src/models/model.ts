
import { SimulationObjectType } from './enums/simulationObjectType';
import { PeriodUnit } from './enums/PeriodUnit';
import { SimulationTimeType } from './enums/simulation_time_type';
import { SimulationObject } from './simulation_object';


export interface Model extends SimulationObject {
    reps: number;
    forecastDays: number;
    type: SimulationObjectType.Model;
    seed?: number; // default is 12345
    oneClockUnit?: PeriodUnit; // default is PeriodUnit.MINUTES
    simulationTimeType?: SimulationTimeType; // default is SimulationTimeType.Clock
    warmupClockPeriod?: number; // default is 0.0
    warmupClockPeriodUnit?: PeriodUnit; // default is PeriodUnit.MINUTES
    runClockPeriod?: number; // default is 0.0
    runClockPeriodUnit?: PeriodUnit; // default is PeriodUnit.MINUTES
    warmupDateTime?: Date | null; // default is null
    startDateTime?: Date | null; // default is null
    finishDateTime?: Date | null; // default is null
}
