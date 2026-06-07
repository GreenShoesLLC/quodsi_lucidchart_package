"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstantDistribution = exports.CONSTANT_PARAMETER_METADATA = exports.DEFAULT_CONSTANT_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for CONSTANT distribution.
 */
exports.DEFAULT_CONSTANT_PARAMETERS = {
    value: 1
};
/**
 * Metadata for ConstantParameters fields.
 */
exports.CONSTANT_PARAMETER_METADATA = {
    value: {
        label: "Value",
        description: "The constant duration value",
        min: 0,
        step: 0.1
    }
};
/**
 * Functions for working with Constant distributions
 */
var ConstantDistribution = /** @class */ (function () {
    function ConstantDistribution() {
    }
    /**
     * Creates a default CONSTANT distribution
     */
    ConstantDistribution.createDefault = function () {
        return ConstantDistribution.create(exports.DEFAULT_CONSTANT_PARAMETERS.value);
    };
    /**
     * Creates a CONSTANT distribution with the specified value
     */
    ConstantDistribution.create = function (value) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.CONSTANT, { value: value });
    };
    /**
     * Validates CONSTANT distribution parameters
     */
    ConstantDistribution.validateParameters = function (params) {
        return typeof params.value === 'number' && params.value >= 0;
    };
    /**
     * Gets the effective value of a CONSTANT distribution
     */
    ConstantDistribution.getEffectiveValue = function (params) {
        return params.value;
    };
    return ConstantDistribution;
}());
exports.ConstantDistribution = ConstantDistribution;
