"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegativeBinomialDistribution = exports.NEGATIVE_BINOMIAL_PARAMETER_METADATA = exports.DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for NEGATIVE_BINOMIAL distribution.
 */
exports.DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS = {
    n: 5,
    p: 0.5
};
/**
 * Metadata for NegativeBinomialParameters fields.
 */
exports.NEGATIVE_BINOMIAL_PARAMETER_METADATA = {
    n: {
        label: "N",
        description: "The number of successes",
        min: 1,
        step: 1
    },
    p: {
        label: "P",
        description: "The probability of success in a single trial",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Negative Binomial distributions
 */
var NegativeBinomialDistribution = /** @class */ (function () {
    function NegativeBinomialDistribution() {
    }
    /**
     * Creates a default NEGATIVE_BINOMIAL distribution
     */
    NegativeBinomialDistribution.createDefault = function () {
        return NegativeBinomialDistribution.create(exports.DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS.n, exports.DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS.p);
    };
    /**
     * Creates a NEGATIVE_BINOMIAL distribution with the specified parameters
     */
    NegativeBinomialDistribution.create = function (n, p) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.NEGATIVE_BINOMIAL, { n: n, p: p });
    };
    /**
     * Validates NEGATIVE_BINOMIAL distribution parameters
     */
    NegativeBinomialDistribution.validateParameters = function (params) {
        return (typeof params.n === 'number' &&
            typeof params.p === 'number' &&
            params.n >= 1 &&
            params.n === Math.floor(params.n) &&
            params.p > 0 &&
            params.p <= 1);
    };
    /**
     * Gets the effective value of a NEGATIVE_BINOMIAL distribution (mean)
     */
    NegativeBinomialDistribution.getEffectiveValue = function (params) {
        return params.n / params.p;
    };
    return NegativeBinomialDistribution;
}());
exports.NegativeBinomialDistribution = NegativeBinomialDistribution;
