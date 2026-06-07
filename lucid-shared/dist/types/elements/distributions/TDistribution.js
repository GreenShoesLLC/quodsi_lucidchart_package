"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TDistribution = exports.T_DISTRIBUTION_PARAMETER_METADATA = exports.DEFAULT_T_DISTRIBUTION_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for T_DISTRIBUTION distribution.
 */
exports.DEFAULT_T_DISTRIBUTION_PARAMETERS = {
    df: 1
};
/**
 * Metadata for TDistributionParameters fields.
 */
exports.T_DISTRIBUTION_PARAMETER_METADATA = {
    df: {
        label: "Degrees of Freedom",
        description: "The degrees of freedom parameter",
        min: 1,
        step: 1
    }
};
/**
 * Functions for working with T distributions
 */
var TDistribution = /** @class */ (function () {
    function TDistribution() {
    }
    /**
     * Creates a default T_DISTRIBUTION distribution
     */
    TDistribution.createDefault = function () {
        return TDistribution.create(exports.DEFAULT_T_DISTRIBUTION_PARAMETERS.df);
    };
    /**
     * Creates a T_DISTRIBUTION distribution with the specified parameter
     */
    TDistribution.create = function (df) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.T_DISTRIBUTION, { df: df });
    };
    /**
     * Validates T_DISTRIBUTION distribution parameters
     */
    TDistribution.validateParameters = function (params) {
        return (typeof params.df === 'number' &&
            params.df >= 1 &&
            params.df === Math.floor(params.df));
    };
    /**
     * Gets the effective value of a T_DISTRIBUTION distribution (mean if defined)
     */
    TDistribution.getEffectiveValue = function (params) {
        // Mean = 0 for df > 1, otherwise undefined
        return 0;
    };
    return TDistribution;
}());
exports.TDistribution = TDistribution;
