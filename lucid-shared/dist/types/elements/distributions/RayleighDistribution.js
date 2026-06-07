"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RayleighDistribution = exports.RAYLEIGH_PARAMETER_METADATA = exports.DEFAULT_RAYLEIGH_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for RAYLEIGH distribution.
 */
exports.DEFAULT_RAYLEIGH_PARAMETERS = {
    scale: 1
};
/**
 * Metadata for RayleighParameters fields.
 */
exports.RAYLEIGH_PARAMETER_METADATA = {
    scale: {
        label: "Scale",
        description: "The scale parameter of the Rayleigh distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Rayleigh distributions
 */
var RayleighDistribution = /** @class */ (function () {
    function RayleighDistribution() {
    }
    /**
     * Creates a default RAYLEIGH distribution
     */
    RayleighDistribution.createDefault = function () {
        return RayleighDistribution.create(exports.DEFAULT_RAYLEIGH_PARAMETERS.scale);
    };
    /**
     * Creates a RAYLEIGH distribution with the specified parameter
     */
    RayleighDistribution.create = function (scale) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.RAYLEIGH, { scale: scale });
    };
    /**
     * Validates RAYLEIGH distribution parameters
     */
    RayleighDistribution.validateParameters = function (params) {
        return typeof params.scale === 'number' && params.scale > 0;
    };
    /**
     * Gets the effective value of a RAYLEIGH distribution (mean)
     */
    RayleighDistribution.getEffectiveValue = function (params) {
        // Mean = scale * sqrt(π/2)
        return params.scale * Math.sqrt(Math.PI / 2);
    };
    return RayleighDistribution;
}());
exports.RayleighDistribution = RayleighDistribution;
