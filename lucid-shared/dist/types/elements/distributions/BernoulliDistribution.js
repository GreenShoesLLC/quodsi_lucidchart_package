"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BernoulliDistribution = exports.BERNOULLI_PARAMETER_METADATA = exports.DEFAULT_BERNOULLI_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for BERNOULLI distribution.
 */
exports.DEFAULT_BERNOULLI_PARAMETERS = {
    p: 0.5
};
/**
 * Metadata for BernoulliParameters fields.
 */
exports.BERNOULLI_PARAMETER_METADATA = {
    p: {
        label: "P",
        description: "The probability of success (1)",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Bernoulli distributions
 */
var BernoulliDistribution = /** @class */ (function () {
    function BernoulliDistribution() {
    }
    /**
     * Creates a default BERNOULLI distribution
     */
    BernoulliDistribution.createDefault = function () {
        return BernoulliDistribution.create(exports.DEFAULT_BERNOULLI_PARAMETERS.p);
    };
    /**
     * Creates a BERNOULLI distribution with the specified probability
     */
    BernoulliDistribution.create = function (p) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.BERNOULLI, { p: p });
    };
    /**
     * Validates BERNOULLI distribution parameters
     */
    BernoulliDistribution.validateParameters = function (params) {
        return typeof params.p === 'number' && params.p >= 0 && params.p <= 1;
    };
    /**
     * Gets the effective value of a BERNOULLI distribution (mean)
     */
    BernoulliDistribution.getEffectiveValue = function (params) {
        return params.p;
    };
    return BernoulliDistribution;
}());
exports.BernoulliDistribution = BernoulliDistribution;
