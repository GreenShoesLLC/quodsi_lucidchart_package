"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalDistribution = exports.NORMAL_PARAMETER_METADATA = exports.DEFAULT_NORMAL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for NORMAL distribution.
 */
exports.DEFAULT_NORMAL_PARAMETERS = {
    mean: 5,
    std: 1
};
/**
 * Metadata for NormalParameters fields.
 */
exports.NORMAL_PARAMETER_METADATA = {
    mean: {
        label: "Mean",
        description: "The average value of the normal distribution",
        min: 0,
        step: 0.1
    },
    std: {
        label: "Standard Deviation",
        description: "The standard deviation of the normal distribution",
        min: 0.1,
        step: 0.1
    }
};
/**
 * Functions for working with Normal distributions
 */
var NormalDistribution = /** @class */ (function () {
    function NormalDistribution() {
    }
    /**
     * Creates a default NORMAL distribution
     */
    NormalDistribution.createDefault = function () {
        return NormalDistribution.create(exports.DEFAULT_NORMAL_PARAMETERS.mean, exports.DEFAULT_NORMAL_PARAMETERS.std);
    };
    /**
     * Creates a NORMAL distribution with the specified parameters
     */
    NormalDistribution.create = function (mean, std) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.NORMAL, { mean: mean, std: std });
    };
    /**
     * Validates NORMAL distribution parameters
     */
    NormalDistribution.validateParameters = function (params) {
        return (typeof params.mean === 'number' &&
            typeof params.std === 'number' &&
            params.mean >= 0 &&
            params.std > 0);
    };
    /**
     * Gets the effective value of a NORMAL distribution (mean)
     */
    NormalDistribution.getEffectiveValue = function (params) {
        return params.mean;
    };
    return NormalDistribution;
}());
exports.NormalDistribution = NormalDistribution;
