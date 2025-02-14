import { PeriodUnit } from '../../types/elements/PeriodUnit';
import { DurationType } from '../../types/elements/DurationType';
import { Distribution } from '../../types/elements/Distribution';

export interface ISerializedDuration {
    durationLength: number;
    durationPeriodUnit: PeriodUnit;
    durationType: DurationType;
    distribution: Distribution | null;
}
