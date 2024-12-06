import { PeriodUnit } from "./PeriodUnit";
import { DurationType } from "./DurationType";
import { Distribution } from "./Distribution";
export declare class Duration {
    durationLength: number;
    durationPeriodUnit: PeriodUnit;
    durationType: DurationType;
    distribution: Distribution | null;
    constructor(durationLength?: number, durationPeriodUnit?: PeriodUnit, durationType?: DurationType, distribution?: Distribution | null);
}
