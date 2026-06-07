"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeibullDistribution = exports.WEIBULL_PARAMETER_METADATA = exports.DEFAULT_WEIBULL_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for WEIBULL distribution.
 */
exports.DEFAULT_WEIBULL_PARAMETERS = {
    a: 1
};
/**
 * Metadata for WeibullParameters fields.
 */
exports.WEIBULL_PARAMETER_METADATA = {
    a: {
        label: "Shape",
        description: "The shape parameter of the Weibull distribution",
        min: 0.01,
        step: 0.1
    }
};
/**
 * Functions for working with Weibull distributions
 */
var WeibullDistribution = /** @class */ (function () {
    function WeibullDistribution() {
    }
    /**
     * Creates a default WEIBULL distribution
     */
    WeibullDistribution.createDefault = function () {
        return WeibullDistribution.create(exports.DEFAULT_WEIBULL_PARAMETERS.a);
    };
    /**
     * Creates a WEIBULL distribution with the specified parameters
     */
    WeibullDistribution.create = function (a) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.WEIBULL, { a: a });
    };
    /**
     * Validates WEIBULL distribution parameters
     */
    WeibullDistribution.validateParameters = function (params) {
        return typeof params.a === 'number' && params.a > 0;
    };
    /**
     * Gets the effective value of a WEIBULL distribution
     * For this simple implementation, we just return the shape parameter
     */
    WeibullDistribution.getEffectiveValue = function (params) {
        return params.a;
    };
    return WeibullDistribution;
}());
exports.WeibullDistribution = WeibullDistribution;
