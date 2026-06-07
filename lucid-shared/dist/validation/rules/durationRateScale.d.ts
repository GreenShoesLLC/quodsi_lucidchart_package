import { DistributionType } from "../../types/elements/DistributionType";
import { ChangeRequestValidationResult } from "./ScenarioChangeValidation";
export declare function canRateScale(distributionType: DistributionType): boolean;
export declare function validateRateMultiplier(factor: number, currentDistributionType: DistributionType | undefined): ChangeRequestValidationResult;
//# sourceMappingURL=durationRateScale.d.ts.map