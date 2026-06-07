"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VonMisesDistribution = exports.VON_MISES_PARAMETER_METADATA = exports.DEFAULT_VON_MISES_PARAMETERS = void 0;
var Distribution_1 = require("../Distribution");
var DistributionType_1 = require("../DistributionType");
/**
 * Default parameters for VON_MISES distribution.
 */
exports.DEFAULT_VON_MISES_PARAMETERS = {
    mu: 0,
    kappa: 1
};
/**
 * Metadata for VonMisesParameters fields.
 */
exports.VON_MISES_PARAMETER_METADATA = {
    mu: {
        label: "Mu",
        description: "The location parameter (mean angle)",
        step: 0.1
    },
    kappa: {
        label: "Kappa",
        description: "The concentration parameter",
        min: 0,
        step: 0.1
    }
};
/**
 * Functions for working with Von Mises distributions
 */
var VonMisesDistribution = /** @class */ (function () {
    function VonMisesDistribution() {
    }
    /**
     * Creates a default VON_MISES distribution
     */
    VonMisesDistribution.createDefault = function () {
        return VonMisesDistribution.create(exports.DEFAULT_VON_MISES_PARAMETERS.mu, exports.DEFAULT_VON_MISES_PARAMETERS.kappa);
    };
    /**
     * Creates a VON_MISES distribution with the specified parameters
     */
    VonMisesDistribution.create = function (mu, kappa) {
        return new Distribution_1.Distribution(DistributionType_1.DistributionType.VON_MISES, { mu: mu, kappa: kappa });
    };
    /**
     * Validates VON_MISES distribution parameters
     */
    VonMisesDistribution.validateParameters = function (params) {
        return (typeof params.mu === 'number' &&
            typeof params.kappa === 'number' &&
            params.kappa >= 0);
    };
    /**
     * Gets the effective value of a VON_MISES distribution (mean)
     */
    VonMisesDistribution.getEffectiveValue = function (params) {
        return params.mu;
    };
    return VonMisesDistribution;
}());
exports.VonMisesDistribution = VonMisesDistribution;
