"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HypergeometricDistribution = exports.HYPERGEOMETRIC_PARAMETER_METADATA = exports.DEFAULT_HYPERGEOMETRIC_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for HYPERGEOMETRIC distribution.
 */
exports.DEFAULT_HYPERGEOMETRIC_PARAMETERS = {
    ngood: 10,
    nbad: 10,
    nsample: 10
};
/**
 * Metadata for HypergeometricParameters fields.
 */
exports.HYPERGEOMETRIC_PARAMETER_METADATA = {
    ngood: {
        label: "Good Items",
        description: "The number of good items in the population",
        min: 0,
        step: 1
    },
    nbad: {
        label: "Bad Items",
        description: "The number of bad items in the population",
        min: 0,
        step: 1
    },
    nsample: {
        label: "Sample Size",
        description: "The number of items drawn from the population",
        min: 1,
        step: 1
    }
};
/**
 * Functions for working with Hypergeometric distributions
 */
var HypergeometricDistribution = /** @class */ (function () {
    function HypergeometricDistribution() {
    }
    /**
     * Creates a default HYPERGEOMETRIC distribution
     */
    HypergeometricDistribution.createDefault = function () {
        return HypergeometricDistribution.create(exports.DEFAULT_HYPERGEOMETRIC_PARAMETERS.ngood, exports.DEFAULT_HYPERGEOMETRIC_PARAMETERS.nbad, exports.DEFAULT_HYPERGEOMETRIC_PARAMETERS.nsample);
    };
    /**
     * Creates a HYPERGEOMETRIC distribution with the specified parameters
     */
    HypergeometricDistribution.create = function (ngood, nbad, nsample) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.HYPERGEOMETRIC, { ngood: ngood, nbad: nbad, nsample: nsample });
    };
    /**
     * Validates HYPERGEOMETRIC distribution parameters
     */
    HypergeometricDistribution.validateParameters = function (params) {
        return (typeof params.ngood === 'number' &&
            typeof params.nbad === 'number' &&
            typeof params.nsample === 'number' &&
            params.ngood >= 0 &&
            params.nbad >= 0 &&
            params.nsample >= 1 &&
            params.ngood === Math.floor(params.ngood) &&
            params.nbad === Math.floor(params.nbad) &&
            params.nsample === Math.floor(params.nsample) &&
            params.nsample <= (params.ngood + params.nbad));
    };
    /**
     * Gets the effective value of a HYPERGEOMETRIC distribution (mean)
     */
    HypergeometricDistribution.getEffectiveValue = function (params) {
        var totalPopulation = params.ngood + params.nbad;
        if (totalPopulation === 0) {
            return 0;
        }
        return params.nsample * (params.ngood / totalPopulation);
    };
    return HypergeometricDistribution;
}());
exports.HypergeometricDistribution = HypergeometricDistribution;
