"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogSeriesDistribution = exports.LOG_SERIES_PARAMETER_METADATA = exports.DEFAULT_LOG_SERIES_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for LOG_SERIES distribution.
 */
exports.DEFAULT_LOG_SERIES_PARAMETERS = {
    p: 0.5
};
/**
 * Metadata for LogSeriesParameters fields.
 */
exports.LOG_SERIES_PARAMETER_METADATA = {
    p: {
        label: "P",
        description: "The probability parameter",
        min: 0,
        max: 1,
        step: 0.01
    }
};
/**
 * Functions for working with Log Series distributions
 */
var LogSeriesDistribution = /** @class */ (function () {
    function LogSeriesDistribution() {
    }
    /**
     * Creates a default LOG_SERIES distribution
     */
    LogSeriesDistribution.createDefault = function () {
        return LogSeriesDistribution.create(exports.DEFAULT_LOG_SERIES_PARAMETERS.p);
    };
    /**
     * Creates a LOG_SERIES distribution with the specified parameter
     */
    LogSeriesDistribution.create = function (p) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.LOG_SERIES, { p: p });
    };
    /**
     * Validates LOG_SERIES distribution parameters
     */
    LogSeriesDistribution.validateParameters = function (params) {
        return typeof params.p === 'number' && params.p > 0 && params.p < 1;
    };
    /**
     * Gets the effective value of a LOG_SERIES distribution (mean)
     */
    LogSeriesDistribution.getEffectiveValue = function (params) {
        // Mean = -p / ((1-p) * ln(1-p))
        var p = params.p;
        return -p / ((1 - p) * Math.log(1 - p));
    };
    return LogSeriesDistribution;
}());
exports.LogSeriesDistribution = LogSeriesDistribution;
