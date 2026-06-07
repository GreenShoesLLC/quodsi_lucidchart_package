"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetaDistribution = exports.BETA_PARAMETER_METADATA = exports.DEFAULT_BETA_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for BETA distribution.
 */
exports.DEFAULT_BETA_PARAMETERS = {
    alpha: 2,
    beta: 5
};
/**
 * Metadata for BetaParameters fields.
 */
exports.BETA_PARAMETER_METADATA = {
    alpha: {
        label: "Alpha",
        description: "The alpha parameter of the beta distribution",
        min: 0.01,
        step: 0.1
    },
    beta: {
        label: "Beta",
        description: "The beta parameter of the beta distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Beta distributions
 */
var BetaDistribution = /** @class */ (function () {
    function BetaDistribution() {
    }
    /**
     * Creates a default BETA distribution
     */
    BetaDistribution.createDefault = function () {
        return BetaDistribution.create(exports.DEFAULT_BETA_PARAMETERS.alpha, exports.DEFAULT_BETA_PARAMETERS.beta);
    };
    /**
     * Creates a BETA distribution with the specified parameters
     */
    BetaDistribution.create = function (alpha, beta) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.BETA, { alpha: alpha, beta: beta });
    };
    /**
     * Validates BETA distribution parameters
     */
    BetaDistribution.validateParameters = function (params) {
        return (typeof params.alpha === 'number' &&
            typeof params.beta === 'number' &&
            params.alpha > 0 &&
            params.beta > 0);
    };
    /**
     * Gets the effective value of a BETA distribution (mean)
     */
    BetaDistribution.getEffectiveValue = function (params) {
        // Mean of Beta(alpha, beta) is alpha / (alpha + beta)
        return params.alpha / (params.alpha + params.beta);
    };
    return BetaDistribution;
}());
exports.BetaDistribution = BetaDistribution;
