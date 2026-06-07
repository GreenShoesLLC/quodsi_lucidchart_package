"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaldDistribution = exports.WALD_PARAMETER_METADATA = exports.DEFAULT_WALD_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for WALD distribution.
 */
exports.DEFAULT_WALD_PARAMETERS = {
    mean: 1,
    scale: 1
};
/**
 * Metadata for WaldParameters fields.
 */
exports.WALD_PARAMETER_METADATA = {
    mean: {
        label: "Mean",
        description: "The mean parameter",
        min: 0.01,
        step: 0.1
    },
    scale: {
        label: "Scale",
        description: "The scale parameter",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Wald distributions
 */
var WaldDistribution = /** @class */ (function () {
    function WaldDistribution() {
    }
    /**
     * Creates a default WALD distribution
     */
    WaldDistribution.createDefault = function () {
        return WaldDistribution.create(exports.DEFAULT_WALD_PARAMETERS.mean, exports.DEFAULT_WALD_PARAMETERS.scale);
    };
    /**
     * Creates a WALD distribution with the specified parameters
     */
    WaldDistribution.create = function (mean, scale) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.WALD, { mean: mean, scale: scale });
    };
    /**
     * Validates WALD distribution parameters
     */
    WaldDistribution.validateParameters = function (params) {
        return (typeof params.mean === 'number' &&
            typeof params.scale === 'number' &&
            params.mean > 0 &&
            params.scale > 0);
    };
    /**
     * Gets the effective value of a WALD distribution (mean)
     */
    WaldDistribution.getEffectiveValue = function (params) {
        return params.mean;
    };
    return WaldDistribution;
}());
exports.WaldDistribution = WaldDistribution;
