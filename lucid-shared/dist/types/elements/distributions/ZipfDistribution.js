"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipfDistribution = exports.ZIPF_PARAMETER_METADATA = exports.DEFAULT_ZIPF_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for ZIPF distribution.
 */
exports.DEFAULT_ZIPF_PARAMETERS = {
    a: 2
};
/**
 * Metadata for ZipfParameters fields.
 */
exports.ZIPF_PARAMETER_METADATA = {
    a: {
        label: "Alpha",
        description: "The exponent parameter",
        min: 1.01,
        step: 0.1
    }
};
/**
 * Functions for working with Zipf distributions
 */
var ZipfDistribution = /** @class */ (function () {
    function ZipfDistribution() {
    }
    /**
     * Creates a default ZIPF distribution
     */
    ZipfDistribution.createDefault = function () {
        return ZipfDistribution.create(exports.DEFAULT_ZIPF_PARAMETERS.a);
    };
    /**
     * Creates a ZIPF distribution with the specified parameter
     */
    ZipfDistribution.create = function (a) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.ZIPF, { a: a });
    };
    /**
     * Validates ZIPF distribution parameters
     */
    ZipfDistribution.validateParameters = function (params) {
        return typeof params.a === 'number' && params.a > 1;
    };
    /**
     * Gets the effective value of a ZIPF distribution
     * For simplicity, return the parameter value
     */
    ZipfDistribution.getEffectiveValue = function (params) {
        return params.a;
    };
    return ZipfDistribution;
}());
exports.ZipfDistribution = ZipfDistribution;
