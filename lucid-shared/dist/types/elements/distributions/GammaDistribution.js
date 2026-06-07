"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GammaDistribution = exports.GAMMA_PARAMETER_METADATA = exports.DEFAULT_GAMMA_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for GAMMA distribution.
 */
exports.DEFAULT_GAMMA_PARAMETERS = {
    shape: 2,
    scale: 2
};
/**
 * Metadata for GammaParameters fields.
 */
exports.GAMMA_PARAMETER_METADATA = {
    shape: {
        label: "Shape",
        description: "The shape parameter (k) of the gamma distribution",
        min: 0.01,
        step: 0.1
    },
    scale: {
        label: "Scale",
        description: "The scale parameter (θ) of the gamma distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Gamma distributions
 */
var GammaDistribution = /** @class */ (function () {
    function GammaDistribution() {
    }
    /**
     * Creates a default GAMMA distribution
     */
    GammaDistribution.createDefault = function () {
        return GammaDistribution.create(exports.DEFAULT_GAMMA_PARAMETERS.shape, exports.DEFAULT_GAMMA_PARAMETERS.scale);
    };
    /**
     * Creates a GAMMA distribution with the specified parameters
     */
    GammaDistribution.create = function (shape, scale) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.GAMMA, { shape: shape, scale: scale });
    };
    /**
     * Validates GAMMA distribution parameters
     */
    GammaDistribution.validateParameters = function (params) {
        return (typeof params.shape === 'number' &&
            typeof params.scale === 'number' &&
            params.shape > 0 &&
            params.scale > 0);
    };
    /**
     * Gets the effective value of a GAMMA distribution (mean)
     */
    GammaDistribution.getEffectiveValue = function (params) {
        // Mean of Gamma(k, θ) is k * θ
        return params.shape * params.scale;
    };
    return GammaDistribution;
}());
exports.GammaDistribution = GammaDistribution;
