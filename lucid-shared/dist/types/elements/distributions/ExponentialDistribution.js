"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExponentialDistribution = exports.EXPONENTIAL_PARAMETER_METADATA = exports.DEFAULT_EXPONENTIAL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for EXPONENTIAL distribution.
 */
exports.DEFAULT_EXPONENTIAL_PARAMETERS = {
    scale: 1
};
/**
 * Metadata for ExponentialParameters fields.
 */
exports.EXPONENTIAL_PARAMETER_METADATA = {
    scale: {
        label: "Scale",
        description: "The scale parameter of the exponential distribution (1/lambda)",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Exponential distributions
 */
var ExponentialDistribution = /** @class */ (function () {
    function ExponentialDistribution() {
    }
    /**
     * Creates a default EXPONENTIAL distribution
     */
    ExponentialDistribution.createDefault = function () {
        return ExponentialDistribution.create(exports.DEFAULT_EXPONENTIAL_PARAMETERS.scale);
    };
    /**
     * Creates an EXPONENTIAL distribution with the specified scale
     */
    ExponentialDistribution.create = function (scale) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.EXPONENTIAL, { scale: scale });
    };
    /**
     * Validates EXPONENTIAL distribution parameters
     */
    ExponentialDistribution.validateParameters = function (params) {
        return typeof params.scale === 'number' && params.scale > 0;
    };
    /**
     * Gets the effective value of an EXPONENTIAL distribution (mean)
     */
    ExponentialDistribution.getEffectiveValue = function (params) {
        return params.scale;
    };
    return ExponentialDistribution;
}());
exports.ExponentialDistribution = ExponentialDistribution;
