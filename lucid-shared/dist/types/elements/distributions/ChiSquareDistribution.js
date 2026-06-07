"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChiSquareDistribution = exports.CHI_SQUARE_PARAMETER_METADATA = exports.DEFAULT_CHI_SQUARE_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for CHI_SQUARE distribution.
 */
exports.DEFAULT_CHI_SQUARE_PARAMETERS = {
    df: 1
};
/**
 * Metadata for ChiSquareParameters fields.
 */
exports.CHI_SQUARE_PARAMETER_METADATA = {
    df: {
        label: "Degrees of Freedom",
        description: "The degrees of freedom parameter",
        min: 1,
        step: 1
    }
};
/**
 * Functions for working with Chi-Square distributions
 */
var ChiSquareDistribution = /** @class */ (function () {
    function ChiSquareDistribution() {
    }
    /**
     * Creates a default CHI_SQUARE distribution
     */
    ChiSquareDistribution.createDefault = function () {
        return ChiSquareDistribution.create(exports.DEFAULT_CHI_SQUARE_PARAMETERS.df);
    };
    /**
     * Creates a CHI_SQUARE distribution with the specified df
     */
    ChiSquareDistribution.create = function (df) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.CHI_SQUARE, { df: df });
    };
    /**
     * Validates CHI_SQUARE distribution parameters
     */
    ChiSquareDistribution.validateParameters = function (params) {
        return (typeof params.df === 'number' &&
            params.df >= 1 &&
            params.df === Math.floor(params.df));
    };
    /**
     * Gets the effective value of a CHI_SQUARE distribution (mean)
     */
    ChiSquareDistribution.getEffectiveValue = function (params) {
        return params.df;
    };
    return ChiSquareDistribution;
}());
exports.ChiSquareDistribution = ChiSquareDistribution;
