"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LognormalDistribution = exports.LOGNORMAL_PARAMETER_METADATA = exports.DEFAULT_LOGNORMAL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for LOGNORMAL distribution.
 */
exports.DEFAULT_LOGNORMAL_PARAMETERS = {
    mean: 0,
    sigma: 1
};
/**
 * Metadata for LognormalParameters fields.
 */
exports.LOGNORMAL_PARAMETER_METADATA = {
    mean: {
        label: "Mean",
        description: "The mean of the underlying normal distribution",
        step: 0.1
    },
    sigma: {
        label: "Sigma",
        description: "The standard deviation of the underlying normal distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Lognormal distributions
 */
var LognormalDistribution = /** @class */ (function () {
    function LognormalDistribution() {
    }
    /**
     * Creates a default LOGNORMAL distribution
     */
    LognormalDistribution.createDefault = function () {
        return LognormalDistribution.create(exports.DEFAULT_LOGNORMAL_PARAMETERS.mean, exports.DEFAULT_LOGNORMAL_PARAMETERS.sigma);
    };
    /**
     * Creates a LOGNORMAL distribution with the specified parameters
     */
    LognormalDistribution.create = function (mean, sigma) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.LOGNORMAL, { mean: mean, sigma: sigma });
    };
    /**
     * Validates LOGNORMAL distribution parameters
     */
    LognormalDistribution.validateParameters = function (params) {
        return (typeof params.mean === 'number' &&
            typeof params.sigma === 'number' &&
            params.sigma > 0);
    };
    /**
     * Gets the effective value of a LOGNORMAL distribution (median)
     */
    LognormalDistribution.getEffectiveValue = function (params) {
        // The median of a lognormal distribution is exp(mu)
        return Math.exp(params.mean);
    };
    return LognormalDistribution;
}());
exports.LognormalDistribution = LognormalDistribution;
