"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriangularDistribution = exports.TRIANGULAR_PARAMETER_METADATA = exports.DEFAULT_TRIANGULAR_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for TRIANGULAR distribution.
 */
exports.DEFAULT_TRIANGULAR_PARAMETERS = {
    left: 0,
    mode: 5,
    right: 10
};
/**
 * Metadata for TriangularParameters fields.
 */
exports.TRIANGULAR_PARAMETER_METADATA = {
    left: {
        label: "Minimum",
        description: "The minimum value of the triangular distribution",
        min: 0,
        step: 0.1
    },
    mode: {
        label: "Mode",
        description: "The most likely value (peak) of the triangular distribution",
        min: 0,
        step: 0.1
    },
    right: {
        label: "Maximum",
        description: "The maximum value of the triangular distribution",
        min: 0,
        step: 0.1
    }
};
/**
 * Functions for working with Triangular distributions
 */
var TriangularDistribution = /** @class */ (function () {
    function TriangularDistribution() {
    }
    /**
     * Creates a default TRIANGULAR distribution
     */
    TriangularDistribution.createDefault = function () {
        return TriangularDistribution.create(exports.DEFAULT_TRIANGULAR_PARAMETERS.left, exports.DEFAULT_TRIANGULAR_PARAMETERS.mode, exports.DEFAULT_TRIANGULAR_PARAMETERS.right);
    };
    /**
     * Creates a TRIANGULAR distribution with the specified parameters
     */
    TriangularDistribution.create = function (left, mode, right) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.TRIANGULAR, { left: left, mode: mode, right: right });
    };
    /**
     * Validates TRIANGULAR distribution parameters
     */
    TriangularDistribution.validateParameters = function (params) {
        return (typeof params.left === 'number' &&
            typeof params.mode === 'number' &&
            typeof params.right === 'number' &&
            params.left >= 0 &&
            params.mode >= params.left &&
            params.right >= params.mode);
    };
    /**
     * Gets the effective value of a TRIANGULAR distribution (mean)
     */
    TriangularDistribution.getEffectiveValue = function (params) {
        return (params.left + params.mode + params.right) / 3;
    };
    return TriangularDistribution;
}());
exports.TriangularDistribution = TriangularDistribution;
