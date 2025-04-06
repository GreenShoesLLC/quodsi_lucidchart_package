"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDistributionTypeSupported = exports.getDistributionDisplayName = exports.DistributionType = void 0;
var DistributionType;
(function (DistributionType) {
    DistributionType["CONSTANT"] = "constant";
    DistributionType["MULTINOMIAL"] = "multinomial";
    DistributionType["UNIFORM"] = "uniform";
    DistributionType["TRIANGULAR"] = "triangular";
    DistributionType["EXPONENTIAL"] = "exponential";
    DistributionType["NORMAL"] = "normal";
    DistributionType["LOGNORMAL"] = "lognormal";
    DistributionType["BETA"] = "beta";
    DistributionType["GAMMA"] = "gamma";
    DistributionType["WEIBULL"] = "weibull";
    DistributionType["DISCRETE"] = "discrete";
    DistributionType["POISSON"] = "poisson";
    DistributionType["BINOMIAL"] = "binomial";
    DistributionType["BERNOULLI"] = "bernoulli";
    DistributionType["GEOMETRIC"] = "geometric";
    DistributionType["NEGATIVE_BINOMIAL"] = "negative_binomial";
    DistributionType["SAMPLE_MULTINOMIAL"] = "sample_multinomial";
    DistributionType["SAMPLE_MULTINOMIAL_ONE"] = "sample_multinomial_one";
    DistributionType["PROBABILITY_VALUES"] = "probability_values";
    DistributionType["SAMPLE_NEXT_SERVICE_INDEX"] = "sample_next_service_index";
    DistributionType["CHI_SQUARE"] = "chisquare";
    DistributionType["F_DISTRIBUTION"] = "f_distribution";
    DistributionType["HYPERGEOMETRIC"] = "hypergeometric";
    DistributionType["LAPLACE"] = "laplace";
    DistributionType["LOGISTIC"] = "logistic";
    DistributionType["LOG_SERIES"] = "logseries";
    DistributionType["PARETO"] = "pareto";
    DistributionType["RAYLEIGH"] = "rayleigh";
    DistributionType["T_DISTRIBUTION"] = "t_distribution";
    DistributionType["VON_MISES"] = "vonmises";
    DistributionType["WALD"] = "wald";
    DistributionType["ZIPF"] = "zipf";
})(DistributionType = exports.DistributionType || (exports.DistributionType = {}));
// Add helper for display names
function getDistributionDisplayName(type) {
    switch (type) {
        case DistributionType.CONSTANT:
            return "Constant";
        case DistributionType.UNIFORM:
            return "Uniform";
        case DistributionType.TRIANGULAR:
            return "Triangular";
        case DistributionType.NORMAL:
            return "Normal";
        // ... other cases
        default:
            return type.toString().replace(/_/g, ' ').toLowerCase()
                .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
    }
}
exports.getDistributionDisplayName = getDistributionDisplayName;
// Add helper for determining if a distribution is supported in the UI
function isDistributionTypeSupported(type) {
    var supportedTypes = [
        DistributionType.CONSTANT,
        DistributionType.UNIFORM,
        DistributionType.TRIANGULAR,
        DistributionType.NORMAL
    ];
    return supportedTypes.includes(type);
}
exports.isDistributionTypeSupported = isDistributionTypeSupported;
