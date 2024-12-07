import { SimulationObjectType } from './SimulationObjectType';
import { PeriodUnit } from './PeriodUnit';
import { SimulationTimeType } from './SimulationTimeType';
import { SimulationObject } from './SimulationObject';
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
//# sourceMappingURL=Model.d.ts.map