"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRateMultiplier = exports.canRateScale = void 0;
var DistributionType_1 = require("../../types/elements/DistributionType");
/**
 * Distribution types that support CV-preserving arrival-rate scaling.
 * MUST stay in sync with the engine's scale_duration table in
 * quodsim/quodsim/model_definition/scenario_changes/duration_scaling.py
 * (and the monorepo's quodsi_shared durationRateScale.ts).
 */
var RATE_SCALABLE = new Set([
    DistributionType_1.DistributionType.CONSTANT,
    DistributionType_1.DistributionType.UNIFORM,
    DistributionType_1.DistributionType.TRIANGULAR,
    DistributionType_1.DistributionType.NORMAL,
    DistributionType_1.DistributionType.EXPONENTIAL,
    DistributionType_1.DistributionType.GAMMA,
    DistributionType_1.DistributionType.LOGNORMAL,
]);
function canRateScale(distributionType) {
    return RATE_SCALABLE.has(distributionType);
}
exports.canRateScale = canRateScale;
function validateRateMultiplier(factor, currentDistributionType) {
    if (!Number.isFinite(factor) || factor <= 0) {
        return { valid: false, error: "Arrival rate multiplier must be greater than 0" };
    }
    if (currentDistributionType !== undefined && !canRateScale(currentDistributionType)) {
        return {
            valid: false,
            error: "This generator's ".concat(currentDistributionType, " distribution cannot be rate-scaled. Use \"Replace arrival distribution\" instead."),
        };
    }
    if (factor === 1) {
        return { valid: true, warning: "A multiplier of 1 has no effect" };
    }
    return { valid: true };
}
exports.validateRateMultiplier = validateRateMultiplier;
