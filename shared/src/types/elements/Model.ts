import { SimulationObjectType } from './SimulationObjectType';
import { PeriodUnit } from './PeriodUnit';
import { SimulationTimeType } from './SimulationTimeType';
import { SimulationObject } from './SimulationObject';
import { ModelDefaults } from './ModelDefaults';

export class Model implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Model;

    static createDefault(id: string): Model {
        return new Model(
            id, //id
            'New Model', //name
            ModelDefaults.DEFAULT_REPS, //reps
            ModelDefaults.DEFAULT_FORECAST_DAYS, //forecast
            ModelDefaults.DEFAULT_SEED, //seed
            ModelDefaults.DEFAULT_CLOCK_UNIT, //oneClockUnit
            SimulationTimeType.Clock, //oneClockUnit
            0, //simulationTimeType
            PeriodUnit.HOURS, //warmupClockPeriod
            24, //runClockPeriod
            PeriodUnit.HOURS, //runClockPeriodUnit
            null,  // warmupDateTime
            null,  // startDateTime
            null   // finishDateTime
        );
    }
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