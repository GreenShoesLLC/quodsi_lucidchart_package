import { PeriodUnit } from "./PeriodUnit";
import { Distribution } from "./Distribution";
import { ConstantDistribution } from "./distributions";

export class Duration {
    constructor(
        public durationPeriodUnit: PeriodUnit = PeriodUnit.MINUTES,
        public distribution: Distribution = ConstantDistribution.create(0)
    ) { }
}