"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscreteDistribution = exports.DISCRETE_PARAMETER_METADATA = exports.DEFAULT_DISCRETE_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for DISCRETE distribution.
 */
exports.DEFAULT_DISCRETE_PARAMETERS = {
    pvals: [0.5, 0.5]
};
/**
 * Metadata for DiscreteParameters fields.
 */
exports.DISCRETE_PARAMETER_METADATA = {
    pvals: {
        label: "Probability Values",
        description: "The probability values (must sum to 1)",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Discrete distributions
 */
var DiscreteDistribution = /** @class */ (function () {
    function DiscreteDistribution() {
    }
    /**
     * Creates a default DISCRETE distribution
     */
    DiscreteDistribution.createDefault = function () {
        return DiscreteDistribution.create(exports.DEFAULT_DISCRETE_PARAMETERS.pvals);
    };
    /**
     * Creates a DISCRETE distribution with the specified parameters
     */
    DiscreteDistribution.create = function (pvals) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.DISCRETE, { pvals: pvals });
    };
    /**
     * Validates DISCRETE distribution parameters
     */
    DiscreteDistribution.validateParameters = function (params) {
        if (!Array.isArray(params.pvals) || params.pvals.length < 1) {
            return false;
        }
        // All values must be between 0 and 1
        if (params.pvals.some(function (p) { return typeof p !== 'number' || p < 0 || p > 1; })) {
            return false;
        }
        // Values should sum to approximately 1
        var sum = params.pvals.reduce(function (acc, val) { return acc + val; }, 0);
        return Math.abs(sum - 1) < 0.0001;
    };
    /**
     * Gets the effective value of a DISCRETE distribution
     * Returns the expected value (sum of index * probability)
     */
    DiscreteDistribution.getEffectiveValue = function (params) {
        if (params.pvals.length === 0) {
            return 0;
        }
        return params.pvals.reduce(function (acc, val, idx) { return acc + val * idx; }, 0);
    };
    return DiscreteDistribution;
}());
exports.DiscreteDistribution = DiscreteDistribution;
