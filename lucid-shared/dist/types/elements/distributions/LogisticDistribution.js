"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogisticDistribution = exports.LOGISTIC_PARAMETER_METADATA = exports.DEFAULT_LOGISTIC_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for LOGISTIC distribution.
 */
exports.DEFAULT_LOGISTIC_PARAMETERS = {
    loc: 0,
    scale: 1
};
/**
 * Metadata for LogisticParameters fields.
 */
exports.LOGISTIC_PARAMETER_METADATA = {
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
 * Functions for working with Logistic distributions
 */
var LogisticDistribution = /** @class */ (function () {
    function LogisticDistribution() {
    }
    /**
     * Creates a default LOGISTIC distribution
     */
    LogisticDistribution.createDefault = function () {
        return LogisticDistribution.create(exports.DEFAULT_LOGISTIC_PARAMETERS.loc, exports.DEFAULT_LOGISTIC_PARAMETERS.scale);
    };
    /**
     * Creates a LOGISTIC distribution with the specified parameters
     */
    LogisticDistribution.create = function (loc, scale) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.LOGISTIC, { loc: loc, scale: scale });
    };
    /**
     * Validates LOGISTIC distribution parameters
     */
    LogisticDistribution.validateParameters = function (params) {
        return (typeof params.loc === 'number' &&
            typeof params.scale === 'number' &&
            params.scale > 0);
    };
    /**
     * Gets the effective value of a LOGISTIC distribution (mean)
     */
    LogisticDistribution.getEffectiveValue = function (params) {
        return params.loc;
    };
    return LogisticDistribution;
}());
exports.LogisticDistribution = LogisticDistribution;
