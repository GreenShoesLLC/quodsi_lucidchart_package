import { DistributionType } from "../../types/elements/DistributionType";
import { ChangeRequestValidationResult } from "./ScenarioChangeValidation";

/**
 * Distribution types that support CV-preserving arrival-rate scaling.
 * MUST stay in sync with the engine's scale_duration table in
 * quodsim/quodsim/model_definition/scenario_changes/duration_scaling.py
 * (and the monorepo's quodsi_shared durationRateScale.ts).
 */
const RATE_SCALABLE = new Set<DistributionType>([
    DistributionType.CONSTANT,
    DistributionType.UNIFORM,
    DistributionType.TRIANGULAR,
    DistributionType.NORMAL,
    DistributionType.EXPONENTIAL,
    DistributionType.GAMMA,
    DistributionType.LOGNORMAL,
]);

export function canRateScale(distributionType: DistributionType): boolean {
    return RATE_SCALABLE.has(distributionType);
}

export function validateRateMultiplier(
    factor: number,
    currentDistributionType: DistributionType | undefined,
): ChangeRequestValidationResult {
    if (!Number.isFinite(factor) || factor <= 0) {
        return { valid: false, error: "Arrival rate multiplier must be greater than 0" };
    }
    if (currentDistributionType !== undefined && !canRateScale(currentDistributionType)) {
        return {
            valid: false,
            error: `This generator's ${currentDistributionType} distribution cannot be rate-scaled. Use "Replace arrival distribution" instead.`,
        };
    }
    if (factor === 1) {
        return { valid: true, warning: "A multiplier of 1 has no effect" };
    }
    return { valid: true };
}
