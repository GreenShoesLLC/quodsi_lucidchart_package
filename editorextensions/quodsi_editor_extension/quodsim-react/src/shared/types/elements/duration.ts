
import { Distribution } from "./distribution";
import { DurationType } from "./enums/DurationType";
import { PeriodUnit } from "./enums/PeriodUnit";

export class Duration {
    constructor(
        public durationLength: number = 0.0,
        public durationPeriodUnit: PeriodUnit = PeriodUnit.MINUTES,
        public durationType: DurationType = DurationType.CONSTANT,
        public distribution: Distribution | null = null
    ) { }
}