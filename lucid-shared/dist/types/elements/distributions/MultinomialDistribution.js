"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultinomialDistribution = exports.MULTINOMIAL_PARAMETER_METADATA = exports.DEFAULT_MULTINOMIAL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for MULTINOMIAL distribution.
 */
exports.DEFAULT_MULTINOMIAL_PARAMETERS = {
    n: 1,
    pvals: [0.5, 0.5]
};
/**
 * Metadata for MultinomialParameters fields.
 */
exports.MULTINOMIAL_PARAMETER_METADATA = {
    n: {
        label: "N",
        description: "The number of trials",
        min: 1,
        step: 1
    },
    pvals: {
        label: "Probability Values",
        description: "The probability values (must sum to 1)",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Multinomial distributions
 */
var MultinomialDistribution = /** @class */ (function () {
    function MultinomialDistribution() {
    }
    /**
     * Creates a default MULTINOMIAL distribution
     */
    MultinomialDistribution.createDefault = function () {
        return MultinomialDistribution.create(exports.DEFAULT_MULTINOMIAL_PARAMETERS.n, exports.DEFAULT_MULTINOMIAL_PARAMETERS.pvals);
    };
    /**
     * Creates a MULTINOMIAL distribution with the specified parameters
     */
    MultinomialDistribution.create = function (n, pvals) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.MULTINOMIAL, { n: n, pvals: pvals });
    };
    /**
     * Validates MULTINOMIAL distribution parameters
     */
    MultinomialDistribution.validateParameters = function (params) {
        if (typeof params.n !== 'number' || params.n < 1) {
            return false;
        }
        if (!Array.isArray(params.pvals) || params.pvals.length < 2) {
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
     * Gets the effective value of a MULTINOMIAL distribution
     */
    MultinomialDistribution.getEffectiveValue = function (params) {
        return params.n;
    };
    return MultinomialDistribution;
}());
exports.MultinomialDistribution = MultinomialDistribution;
