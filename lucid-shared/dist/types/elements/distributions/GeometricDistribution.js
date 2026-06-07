"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeometricDistribution = exports.GEOMETRIC_PARAMETER_METADATA = exports.DEFAULT_GEOMETRIC_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for GEOMETRIC distribution.
 */
exports.DEFAULT_GEOMETRIC_PARAMETERS = {
    p: 0.5
};
/**
 * Metadata for GeometricParameters fields.
 */
exports.GEOMETRIC_PARAMETER_METADATA = {
    p: {
        label: "P",
        description: "The probability of success in a single trial",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Geometric distributions
 */
var GeometricDistribution = /** @class */ (function () {
    function GeometricDistribution() {
    }
    /**
     * Creates a default GEOMETRIC distribution
     */
    GeometricDistribution.createDefault = function () {
        return GeometricDistribution.create(exports.DEFAULT_GEOMETRIC_PARAMETERS.p);
    };
    /**
     * Creates a GEOMETRIC distribution with the specified probability
     */
    GeometricDistribution.create = function (p) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.GEOMETRIC, { p: p });
    };
    /**
     * Validates GEOMETRIC distribution parameters
     */
    GeometricDistribution.validateParameters = function (params) {
        return typeof params.p === 'number' && params.p > 0 && params.p <= 1;
    };
    /**
     * Gets the effective value of a GEOMETRIC distribution (mean)
     */
    GeometricDistribution.getEffectiveValue = function (params) {
        return 1 / params.p;
    };
    return GeometricDistribution;
}());
exports.GeometricDistribution = GeometricDistribution;
