"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoissonDistribution = exports.POISSON_PARAMETER_METADATA = exports.DEFAULT_POISSON_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for POISSON distribution.
 */
exports.DEFAULT_POISSON_PARAMETERS = {
    lam: 1
};
/**
 * Metadata for PoissonParameters fields.
 */
exports.POISSON_PARAMETER_METADATA = {
    lam: {
        label: "Lambda",
        description: "The rate parameter (mean) of the Poisson distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Poisson distributions
 */
var PoissonDistribution = /** @class */ (function () {
    function PoissonDistribution() {
    }
    /**
     * Creates a default POISSON distribution
     */
    PoissonDistribution.createDefault = function () {
        return PoissonDistribution.create(exports.DEFAULT_POISSON_PARAMETERS.lam);
    };
    /**
     * Creates a POISSON distribution with the specified lambda
     */
    PoissonDistribution.create = function (lam) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.POISSON, { lam: lam });
    };
    /**
     * Validates POISSON distribution parameters
     */
    PoissonDistribution.validateParameters = function (params) {
        return typeof params.lam === 'number' && params.lam > 0;
    };
    /**
     * Gets the effective value of a POISSON distribution (mean)
     */
    PoissonDistribution.getEffectiveValue = function (params) {
        return params.lam;
    };
    return PoissonDistribution;
}());
exports.PoissonDistribution = PoissonDistribution;
