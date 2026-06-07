"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FDistribution = exports.F_DISTRIBUTION_PARAMETER_METADATA = exports.DEFAULT_F_DISTRIBUTION_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for F_DISTRIBUTION distribution.
 */
exports.DEFAULT_F_DISTRIBUTION_PARAMETERS = {
    dfnum: 1,
    dfden: 1
};
/**
 * Metadata for FDistributionParameters fields.
 */
exports.F_DISTRIBUTION_PARAMETER_METADATA = {
    dfnum: {
        label: "Numerator df",
        description: "The degrees of freedom in the numerator",
        min: 1,
        step: 1
    },
    dfden: {
        label: "Denominator df",
        description: "The degrees of freedom in the denominator",
        min: 1,
        step: 1
    }
};
/**
 * Functions for working with F distributions
 */
var FDistribution = /** @class */ (function () {
    function FDistribution() {
    }
    /**
     * Creates a default F_DISTRIBUTION distribution
     */
    FDistribution.createDefault = function () {
        return FDistribution.create(exports.DEFAULT_F_DISTRIBUTION_PARAMETERS.dfnum, exports.DEFAULT_F_DISTRIBUTION_PARAMETERS.dfden);
    };
    /**
     * Creates a F_DISTRIBUTION distribution with the specified parameters
     */
    FDistribution.create = function (dfnum, dfden) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.F_DISTRIBUTION, { dfnum: dfnum, dfden: dfden });
    };
    /**
     * Validates F_DISTRIBUTION distribution parameters
     */
    FDistribution.validateParameters = function (params) {
        return (typeof params.dfnum === 'number' &&
            typeof params.dfden === 'number' &&
            params.dfnum >= 1 &&
            params.dfden >= 1 &&
            params.dfnum === Math.floor(params.dfnum) &&
            params.dfden === Math.floor(params.dfden));
    };
    /**
     * Gets the effective value of a F_DISTRIBUTION distribution (mean if defined)
     */
    FDistribution.getEffectiveValue = function (params) {
        // Mean of F(d1, d2) = d2/(d2-2) for d2 > 2, otherwise undefined
        if (params.dfden > 2) {
            return params.dfden / (params.dfden - 2);
        }
        // Return a reasonable value if mean is undefined
        return 1;
    };
    return FDistribution;
}());
exports.FDistribution = FDistribution;
