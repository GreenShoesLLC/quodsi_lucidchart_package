"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParetoDistribution = exports.PARETO_PARAMETER_METADATA = exports.DEFAULT_PARETO_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for PARETO distribution.
 */
exports.DEFAULT_PARETO_PARAMETERS = {
    a: 3
};
/**
 * Metadata for ParetoParameters fields.
 */
exports.PARETO_PARAMETER_METADATA = {
    a: {
        label: "Alpha",
        description: "The shape parameter of the Pareto distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Pareto distributions
 */
var ParetoDistribution = /** @class */ (function () {
    function ParetoDistribution() {
    }
    /**
     * Creates a default PARETO distribution
     */
    ParetoDistribution.createDefault = function () {
        return ParetoDistribution.create(exports.DEFAULT_PARETO_PARAMETERS.a);
    };
    /**
     * Creates a PARETO distribution with the specified parameter
     */
    ParetoDistribution.create = function (a) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.PARETO, { a: a });
    };
    /**
     * Validates PARETO distribution parameters
     */
    ParetoDistribution.validateParameters = function (params) {
        return typeof params.a === 'number' && params.a > 0;
    };
    /**
     * Gets the effective value of a PARETO distribution (mean if defined)
     */
    ParetoDistribution.getEffectiveValue = function (params) {
        // Mean = a/(a-1) for a > 1, otherwise undefined
        if (params.a > 1) {
            return params.a / (params.a - 1);
        }
        // Return a reasonable value if mean is undefined
        return params.a + 1;
    };
    return ParetoDistribution;
}());
exports.ParetoDistribution = ParetoDistribution;
