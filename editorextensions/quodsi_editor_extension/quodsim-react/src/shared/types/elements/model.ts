import { SimulationObjectType } from './SimulationObjectType';
import { PeriodUnit } from './PeriodUnit';
import { SimulationTimeType } from './SimulationTimeType';
import { SimulationObject } from './SimulationObject';

export class Model implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Model;

    constructor(
        public id: string,
        public name: string,
        public reps: number,
        public forecastDays: number,
        public seed?: number,
        public oneClockUnit?: PeriodUnit,
        public simulationTimeType?: SimulationTimeType,
        public warmupClockPeriod?: number,
        public warmupClockPeriodUnit?: PeriodUnit,
        public runClockPeriod?: number,
        public runClockPeriodUnit?: PeriodUnit,
        public warmupDateTime: Date | null = null,
        public startDateTime: Date | null = null,
        public finishDateTime: Date | null = null
    ) { }
}