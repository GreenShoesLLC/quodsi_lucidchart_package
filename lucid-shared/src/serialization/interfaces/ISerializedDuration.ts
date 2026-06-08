import { PeriodUnit } from '@quodsi/shared';
import { DurationType } from '@quodsi/shared';
import { Distribution } from '@quodsi/shared';

export interface ISerializedDuration {
    // durationLength: number;
    durationPeriodUnit: PeriodUnit;
    // durationType: DurationType;
    distribution: Distribution | null;
}
