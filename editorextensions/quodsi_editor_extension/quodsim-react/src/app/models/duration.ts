import { PeriodUnit } from "./enums/PeriodUnit";
import { DurationType } from "./enums/DurationType";
import { Distribution } from "./distribution";

export class Duration {
    constructor(
        public durationLength: number = 0.0,
        public durationPeriodUnit: PeriodUnit = PeriodUnit.MINUTES,
        public durationType: DurationType = DurationType.CONSTANT,
        public distribution: Distribution | null = null
    ) { }
}