"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDistributionParameters = exports.getDistributionEffectiveValue = exports.createDefaultDistribution = void 0;
var DistributionType_1 = require("../DistributionType");
// Import distribution implementations
var index_1 = require("./index");
/**
 * Creates a default distribution of the specified type
 */
function createDefaultDistribution(type) {
    switch (type) {
        case DistributionType_1.DistributionType.CONSTANT:
            return index_1.ConstantDistribution.createDefault();
        case DistributionType_1.DistributionType.UNIFORM:
            return index_1.UniformDistribution.createDefault();
        case DistributionType_1.DistributionType.TRIANGULAR:
            return index_1.TriangularDistribution.createDefault();
        case DistributionType_1.DistributionType.NORMAL:
            return index_1.NormalDistribution.createDefault();
        case DistributionType_1.DistributionType.EXPONENTIAL:
            return index_1.ExponentialDistribution.createDefault();
        default:
            // Default to CONSTANT if type is not supported
            return index_1.ConstantDistribution.createDefault();
    }
}
exports.createDefaultDistribution = createDefaultDistribution;
/**
 * Gets a representative value of a distribution (mean, mode, etc.)
 * Useful for UI display or calculations
 */
function getDistributionEffectiveValue(distribution) {
    switch (distribution.distributionType) {
        case DistributionType_1.DistributionType.CONSTANT:
            return index_1.ConstantDistribution.getEffectiveValue(distribution.parameters);
        case DistributionType_1.DistributionType.UNIFORM:
            return index_1.UniformDistribution.getEffectiveValue(distribution.parameters);
        case DistributionType_1.DistributionType.TRIANGULAR:
            return index_1.TriangularDistribution.getEffectiveValue(distribution.parameters);
        case DistributionType_1.DistributionType.NORMAL:
            return index_1.NormalDistribution.getEffectiveValue(distribution.parameters);
        case DistributionType_1.DistributionType.EXPONENTIAL:
            return index_1.ExponentialDistribution.getEffectiveValue(distribution.parameters);
        default:
            return 0;
    }
}
exports.getDistributionEffectiveValue = getDistributionEffectiveValue;
/**
 * Validates parameters for a specific distribution type
 * Returns true if valid, false otherwise
 */
function validateDistributionParameters(type, parameters) {
    switch (type) {
        case DistributionType_1.DistributionType.CONSTANT:
            return index_1.ConstantDistribution.validateParameters(parameters);
        case DistributionType_1.DistributionType.UNIFORM:
            return index_1.UniformDistribution.validateParameters(parameters);
        case DistributionType_1.DistributionType.TRIANGULAR:
            return index_1.TriangularDistribution.validateParameters(parameters);
        case DistributionType_1.DistributionType.NORMAL:
            return index_1.NormalDistribution.validateParameters(parameters);
        case DistributionType_1.DistributionType.EXPONENTIAL:
            return index_1.ExponentialDistribution.validateParameters(parameters);
        default:
            return false;
    }
}
exports.validateDistributionParameters = validateDistributionParameters;
