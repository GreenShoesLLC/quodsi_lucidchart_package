"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinomialDistribution = exports.BINOMIAL_PARAMETER_METADATA = exports.DEFAULT_BINOMIAL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for BINOMIAL distribution.
 */
exports.DEFAULT_BINOMIAL_PARAMETERS = {
    n: 10,
    p: 0.5
};
/**
 * Metadata for BinomialParameters fields.
 */
exports.BINOMIAL_PARAMETER_METADATA = {
    n: {
        label: "N",
        description: "The number of trials",
        min: 1,
        step: 1
    },
    p: {
        label: "P",
        description: "The success probability of a single trial",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Binomial distributions
 */
var BinomialDistribution = /** @class */ (function () {
    function BinomialDistribution() {
    }
    /**
     * Creates a default BINOMIAL distribution
     */
    BinomialDistribution.createDefault = function () {
        return BinomialDistribution.create(exports.DEFAULT_BINOMIAL_PARAMETERS.n, exports.DEFAULT_BINOMIAL_PARAMETERS.p);
    };
    /**
     * Creates a BINOMIAL distribution with the specified parameters
     */
    BinomialDistribution.create = function (n, p) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.BINOMIAL, { n: n, p: p });
    };
    /**
     * Validates BINOMIAL distribution parameters
     */
    BinomialDistribution.validateParameters = function (params) {
        return (typeof params.n === 'number' &&
            typeof params.p === 'number' &&
            params.n >= 1 &&
            params.n === Math.floor(params.n) &&
            params.p >= 0 &&
            params.p <= 1);
    };
    /**
     * Gets the effective value of a BINOMIAL distribution (mean)
     */
    BinomialDistribution.getEffectiveValue = function (params) {
        return params.n * params.p;
    };
    return BinomialDistribution;
}());
exports.BinomialDistribution = BinomialDistribution;
