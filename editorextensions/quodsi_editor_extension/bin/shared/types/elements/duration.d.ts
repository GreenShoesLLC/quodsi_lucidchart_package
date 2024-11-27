import { PeriodUnit } from "./enums/PeriodUnit";
import { DurationType } from "./enums/DurationType";
import { Distribution } from "./distribution";
export declare class Duration {
    durationLength: number;
    durationPeriodUnit: PeriodUnit;
    durationType: DurationType;
    distribution: Distribution | null;
    constructor(durationLength?: number, durationPeriodUnit?: PeriodUnit, durationType?: DurationType, distribution?: Distribution | null);
}
