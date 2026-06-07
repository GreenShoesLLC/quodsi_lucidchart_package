"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniformDistribution = exports.UNIFORM_PARAMETER_METADATA = exports.DEFAULT_UNIFORM_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for UNIFORM distribution.
 */
exports.DEFAULT_UNIFORM_PARAMETERS = {
    low: 0,
    high: 10
};
/**
 * Metadata for UniformParameters fields.
 */
exports.UNIFORM_PARAMETER_METADATA = {
    low: {
        label: "Minimum",
        description: "The minimum value of the uniform distribution",
        min: 0,
        step: 0.1
    },
    high: {
        label: "Maximum",
        description: "The maximum value of the uniform distribution",
        min: 0,
        step: 0.1
    }
};
/**
 * Functions for working with Uniform distributions
 */
var UniformDistribution = /** @class */ (function () {
    function UniformDistribution() {
    }
    /**
     * Creates a default UNIFORM distribution
     */
    UniformDistribution.createDefault = function () {
        return UniformDistribution.create(exports.DEFAULT_UNIFORM_PARAMETERS.low, exports.DEFAULT_UNIFORM_PARAMETERS.high);
    };
    /**
     * Creates a UNIFORM distribution with the specified parameters
     */
    UniformDistribution.create = function (low, high) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.UNIFORM, { low: low, high: high });
    };
    /**
     * Validates UNIFORM distribution parameters
     */
    UniformDistribution.validateParameters = function (params) {
        return (typeof params.low === 'number' &&
            typeof params.high === 'number' &&
            params.low >= 0 &&
            params.high > params.low);
    };
    /**
     * Gets the effective value of a UNIFORM distribution (mean)
     */
    UniformDistribution.getEffectiveValue = function (params) {
        return (params.low + params.high) / 2;
    };
    return UniformDistribution;
}());
exports.UniformDistribution = UniformDistribution;
