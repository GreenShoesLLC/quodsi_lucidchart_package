"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaplaceDistribution = exports.LAPLACE_PARAMETER_METADATA = exports.DEFAULT_LAPLACE_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for LAPLACE distribution.
 */
exports.DEFAULT_LAPLACE_PARAMETERS = {
    loc: 0,
    scale: 1
};
/**
 * Metadata for LaplaceParameters fields.
 */
exports.LAPLACE_PARAMETER_METADATA = {
    loc: {
        label: "Location",
        description: "The location parameter (mean)",
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
 * Functions for working with Laplace distributions
 */
var LaplaceDistribution = /** @class */ (function () {
    function LaplaceDistribution() {
    }
    /**
     * Creates a default LAPLACE distribution
     */
    LaplaceDistribution.createDefault = function () {
        return LaplaceDistribution.create(exports.DEFAULT_LAPLACE_PARAMETERS.loc, exports.DEFAULT_LAPLACE_PARAMETERS.scale);
    };
    /**
     * Creates a LAPLACE distribution with the specified parameters
     */
    LaplaceDistribution.create = function (loc, scale) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.LAPLACE, { loc: loc, scale: scale });
    };
    /**
     * Validates LAPLACE distribution parameters
     */
    LaplaceDistribution.validateParameters = function (params) {
        return (typeof params.loc === 'number' &&
            typeof params.scale === 'number' &&
            params.scale > 0);
    };
    /**
     * Gets the effective value of a LAPLACE distribution (mean)
     */
    LaplaceDistribution.getEffectiveValue = function (params) {
        return params.loc;
    };
    return LaplaceDistribution;
}());
exports.LaplaceDistribution = LaplaceDistribution;
