import { PeriodUnit } from "./PeriodUnit";
import { DurationType } from "./DurationType";
import { Distribution } from "./Distribution";

export class Duration {
    constructor(
        public durationLength: number = 0.0,
        public durationPeriodUnit: PeriodUnit = PeriodUnit.MINUTES,
        public durationType: DurationType = DurationType.CONSTANT,
        public distribution: Distribution | null = null
    ) { }
}