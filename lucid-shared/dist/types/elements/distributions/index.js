"use strict";
/**
 * Re-export all distribution types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEGATIVE_BINOMIAL_PARAMETER_METADATA = exports.DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS = exports.MultinomialDistribution = exports.MULTINOMIAL_PARAMETER_METADATA = exports.DEFAULT_MULTINOMIAL_PARAMETERS = exports.LogSeriesDistribution = exports.LOG_SERIES_PARAMETER_METADATA = exports.DEFAULT_LOG_SERIES_PARAMETERS = exports.LognormalDistribution = exports.LOGNORMAL_PARAMETER_METADATA = exports.DEFAULT_LOGNORMAL_PARAMETERS = exports.LogisticDistribution = exports.LOGISTIC_PARAMETER_METADATA = exports.DEFAULT_LOGISTIC_PARAMETERS = exports.LaplaceDistribution = exports.LAPLACE_PARAMETER_METADATA = exports.DEFAULT_LAPLACE_PARAMETERS = exports.HypergeometricDistribution = exports.HYPERGEOMETRIC_PARAMETER_METADATA = exports.DEFAULT_HYPERGEOMETRIC_PARAMETERS = exports.GeometricDistribution = exports.GEOMETRIC_PARAMETER_METADATA = exports.DEFAULT_GEOMETRIC_PARAMETERS = exports.GammaDistribution = exports.GAMMA_PARAMETER_METADATA = exports.DEFAULT_GAMMA_PARAMETERS = exports.FDistribution = exports.F_DISTRIBUTION_PARAMETER_METADATA = exports.DEFAULT_F_DISTRIBUTION_PARAMETERS = exports.ExponentialDistribution = exports.EXPONENTIAL_PARAMETER_METADATA = exports.DEFAULT_EXPONENTIAL_PARAMETERS = exports.DiscreteDistribution = exports.DISCRETE_PARAMETER_METADATA = exports.DEFAULT_DISCRETE_PARAMETERS = exports.ConstantDistribution = exports.CONSTANT_PARAMETER_METADATA = exports.DEFAULT_CONSTANT_PARAMETERS = exports.ChiSquareDistribution = exports.CHI_SQUARE_PARAMETER_METADATA = exports.DEFAULT_CHI_SQUARE_PARAMETERS = exports.BinomialDistribution = exports.BINOMIAL_PARAMETER_METADATA = exports.DEFAULT_BINOMIAL_PARAMETERS = exports.BetaDistribution = exports.BETA_PARAMETER_METADATA = exports.DEFAULT_BETA_PARAMETERS = exports.BernoulliDistribution = exports.BERNOULLI_PARAMETER_METADATA = exports.DEFAULT_BERNOULLI_PARAMETERS = void 0;
exports.isCoreNumericDistribution = exports.backendStringToDistributionType = exports.distributionTypeToBackendString = exports.CORE_NUMERIC_DISTRIBUTIONS = exports.isDistributionTypeSupported = exports.getDistributionDisplayName = exports.validateDistributionParameters = exports.getDistributionEffectiveValue = exports.createDefaultDistribution = exports.ZipfDistribution = exports.ZIPF_PARAMETER_METADATA = exports.DEFAULT_ZIPF_PARAMETERS = exports.WeibullDistribution = exports.WEIBULL_PARAMETER_METADATA = exports.DEFAULT_WEIBULL_PARAMETERS = exports.WaldDistribution = exports.WALD_PARAMETER_METADATA = exports.DEFAULT_WALD_PARAMETERS = exports.VonMisesDistribution = exports.VON_MISES_PARAMETER_METADATA = exports.DEFAULT_VON_MISES_PARAMETERS = exports.UniformDistribution = exports.UNIFORM_PARAMETER_METADATA = exports.DEFAULT_UNIFORM_PARAMETERS = exports.TriangularDistribution = exports.TRIANGULAR_PARAMETER_METADATA = exports.DEFAULT_TRIANGULAR_PARAMETERS = exports.TDistribution = exports.T_DISTRIBUTION_PARAMETER_METADATA = exports.DEFAULT_T_DISTRIBUTION_PARAMETERS = exports.RayleighDistribution = exports.RAYLEIGH_PARAMETER_METADATA = exports.DEFAULT_RAYLEIGH_PARAMETERS = exports.PoissonDistribution = exports.POISSON_PARAMETER_METADATA = exports.DEFAULT_POISSON_PARAMETERS = exports.ParetoDistribution = exports.PARETO_PARAMETER_METADATA = exports.DEFAULT_PARETO_PARAMETERS = exports.NormalDistribution = exports.NORMAL_PARAMETER_METADATA = exports.DEFAULT_NORMAL_PARAMETERS = exports.NegativeBinomialDistribution = void 0;
// Bernoulli distribution
var BernoulliDistribution_1 = require("./BernoulliDistribution");
Object.defineProperty(exports, "DEFAULT_BERNOULLI_PARAMETERS", { enumerable: true, get: function () { return BernoulliDistribution_1.DEFAULT_BERNOULLI_PARAMETERS; } });
Object.defineProperty(exports, "BERNOULLI_PARAMETER_METADATA", { enumerable: true, get: function () { return BernoulliDistribution_1.BERNOULLI_PARAMETER_METADATA; } });
Object.defineProperty(exports, "BernoulliDistribution", { enumerable: true, get: function () { return BernoulliDistribution_1.BernoulliDistribution; } });
// Beta distribution
var BetaDistribution_1 = require("./BetaDistribution");
Object.defineProperty(exports, "DEFAULT_BETA_PARAMETERS", { enumerable: true, get: function () { return BetaDistribution_1.DEFAULT_BETA_PARAMETERS; } });
Object.defineProperty(exports, "BETA_PARAMETER_METADATA", { enumerable: true, get: function () { return BetaDistribution_1.BETA_PARAMETER_METADATA; } });
Object.defineProperty(exports, "BetaDistribution", { enumerable: true, get: function () { return BetaDistribution_1.BetaDistribution; } });
// Binomial distribution
var BinomialDistribution_1 = require("./BinomialDistribution");
Object.defineProperty(exports, "DEFAULT_BINOMIAL_PARAMETERS", { enumerable: true, get: function () { return BinomialDistribution_1.DEFAULT_BINOMIAL_PARAMETERS; } });
Object.defineProperty(exports, "BINOMIAL_PARAMETER_METADATA", { enumerable: true, get: function () { return BinomialDistribution_1.BINOMIAL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "BinomialDistribution", { enumerable: true, get: function () { return BinomialDistribution_1.BinomialDistribution; } });
// ChiSquare distribution
var ChiSquareDistribution_1 = require("./ChiSquareDistribution");
Object.defineProperty(exports, "DEFAULT_CHI_SQUARE_PARAMETERS", { enumerable: true, get: function () { return ChiSquareDistribution_1.DEFAULT_CHI_SQUARE_PARAMETERS; } });
Object.defineProperty(exports, "CHI_SQUARE_PARAMETER_METADATA", { enumerable: true, get: function () { return ChiSquareDistribution_1.CHI_SQUARE_PARAMETER_METADATA; } });
Object.defineProperty(exports, "ChiSquareDistribution", { enumerable: true, get: function () { return ChiSquareDistribution_1.ChiSquareDistribution; } });
// Constant distribution
var ConstantDistribution_1 = require("./ConstantDistribution");
Object.defineProperty(exports, "DEFAULT_CONSTANT_PARAMETERS", { enumerable: true, get: function () { return ConstantDistribution_1.DEFAULT_CONSTANT_PARAMETERS; } });
Object.defineProperty(exports, "CONSTANT_PARAMETER_METADATA", { enumerable: true, get: function () { return ConstantDistribution_1.CONSTANT_PARAMETER_METADATA; } });
Object.defineProperty(exports, "ConstantDistribution", { enumerable: true, get: function () { return ConstantDistribution_1.ConstantDistribution; } });
// Discrete distribution
var DiscreteDistribution_1 = require("./DiscreteDistribution");
Object.defineProperty(exports, "DEFAULT_DISCRETE_PARAMETERS", { enumerable: true, get: function () { return DiscreteDistribution_1.DEFAULT_DISCRETE_PARAMETERS; } });
Object.defineProperty(exports, "DISCRETE_PARAMETER_METADATA", { enumerable: true, get: function () { return DiscreteDistribution_1.DISCRETE_PARAMETER_METADATA; } });
Object.defineProperty(exports, "DiscreteDistribution", { enumerable: true, get: function () { return DiscreteDistribution_1.DiscreteDistribution; } });
// Exponential distribution
var ExponentialDistribution_1 = require("./ExponentialDistribution");
Object.defineProperty(exports, "DEFAULT_EXPONENTIAL_PARAMETERS", { enumerable: true, get: function () { return ExponentialDistribution_1.DEFAULT_EXPONENTIAL_PARAMETERS; } });
Object.defineProperty(exports, "EXPONENTIAL_PARAMETER_METADATA", { enumerable: true, get: function () { return ExponentialDistribution_1.EXPONENTIAL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "ExponentialDistribution", { enumerable: true, get: function () { return ExponentialDistribution_1.ExponentialDistribution; } });
// F distribution
var FDistribution_1 = require("./FDistribution");
Object.defineProperty(exports, "DEFAULT_F_DISTRIBUTION_PARAMETERS", { enumerable: true, get: function () { return FDistribution_1.DEFAULT_F_DISTRIBUTION_PARAMETERS; } });
Object.defineProperty(exports, "F_DISTRIBUTION_PARAMETER_METADATA", { enumerable: true, get: function () { return FDistribution_1.F_DISTRIBUTION_PARAMETER_METADATA; } });
Object.defineProperty(exports, "FDistribution", { enumerable: true, get: function () { return FDistribution_1.FDistribution; } });
// Gamma distribution
var GammaDistribution_1 = require("./GammaDistribution");
Object.defineProperty(exports, "DEFAULT_GAMMA_PARAMETERS", { enumerable: true, get: function () { return GammaDistribution_1.DEFAULT_GAMMA_PARAMETERS; } });
Object.defineProperty(exports, "GAMMA_PARAMETER_METADATA", { enumerable: true, get: function () { return GammaDistribution_1.GAMMA_PARAMETER_METADATA; } });
Object.defineProperty(exports, "GammaDistribution", { enumerable: true, get: function () { return GammaDistribution_1.GammaDistribution; } });
// Geometric distribution
var GeometricDistribution_1 = require("./GeometricDistribution");
Object.defineProperty(exports, "DEFAULT_GEOMETRIC_PARAMETERS", { enumerable: true, get: function () { return GeometricDistribution_1.DEFAULT_GEOMETRIC_PARAMETERS; } });
Object.defineProperty(exports, "GEOMETRIC_PARAMETER_METADATA", { enumerable: true, get: function () { return GeometricDistribution_1.GEOMETRIC_PARAMETER_METADATA; } });
Object.defineProperty(exports, "GeometricDistribution", { enumerable: true, get: function () { return GeometricDistribution_1.GeometricDistribution; } });
// Hypergeometric distribution
var HypergeometricDistribution_1 = require("./HypergeometricDistribution");
Object.defineProperty(exports, "DEFAULT_HYPERGEOMETRIC_PARAMETERS", { enumerable: true, get: function () { return HypergeometricDistribution_1.DEFAULT_HYPERGEOMETRIC_PARAMETERS; } });
Object.defineProperty(exports, "HYPERGEOMETRIC_PARAMETER_METADATA", { enumerable: true, get: function () { return HypergeometricDistribution_1.HYPERGEOMETRIC_PARAMETER_METADATA; } });
Object.defineProperty(exports, "HypergeometricDistribution", { enumerable: true, get: function () { return HypergeometricDistribution_1.HypergeometricDistribution; } });
// Laplace distribution
var LaplaceDistribution_1 = require("./LaplaceDistribution");
Object.defineProperty(exports, "DEFAULT_LAPLACE_PARAMETERS", { enumerable: true, get: function () { return LaplaceDistribution_1.DEFAULT_LAPLACE_PARAMETERS; } });
Object.defineProperty(exports, "LAPLACE_PARAMETER_METADATA", { enumerable: true, get: function () { return LaplaceDistribution_1.LAPLACE_PARAMETER_METADATA; } });
Object.defineProperty(exports, "LaplaceDistribution", { enumerable: true, get: function () { return LaplaceDistribution_1.LaplaceDistribution; } });
// Logistic distribution
var LogisticDistribution_1 = require("./LogisticDistribution");
Object.defineProperty(exports, "DEFAULT_LOGISTIC_PARAMETERS", { enumerable: true, get: function () { return LogisticDistribution_1.DEFAULT_LOGISTIC_PARAMETERS; } });
Object.defineProperty(exports, "LOGISTIC_PARAMETER_METADATA", { enumerable: true, get: function () { return LogisticDistribution_1.LOGISTIC_PARAMETER_METADATA; } });
Object.defineProperty(exports, "LogisticDistribution", { enumerable: true, get: function () { return LogisticDistribution_1.LogisticDistribution; } });
// Lognormal distribution
var LognormalDistribution_1 = require("./LognormalDistribution");
Object.defineProperty(exports, "DEFAULT_LOGNORMAL_PARAMETERS", { enumerable: true, get: function () { return LognormalDistribution_1.DEFAULT_LOGNORMAL_PARAMETERS; } });
Object.defineProperty(exports, "LOGNORMAL_PARAMETER_METADATA", { enumerable: true, get: function () { return LognormalDistribution_1.LOGNORMAL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "LognormalDistribution", { enumerable: true, get: function () { return LognormalDistribution_1.LognormalDistribution; } });
// LogSeries distribution
var LogSeriesDistribution_1 = require("./LogSeriesDistribution");
Object.defineProperty(exports, "DEFAULT_LOG_SERIES_PARAMETERS", { enumerable: true, get: function () { return LogSeriesDistribution_1.DEFAULT_LOG_SERIES_PARAMETERS; } });
Object.defineProperty(exports, "LOG_SERIES_PARAMETER_METADATA", { enumerable: true, get: function () { return LogSeriesDistribution_1.LOG_SERIES_PARAMETER_METADATA; } });
Object.defineProperty(exports, "LogSeriesDistribution", { enumerable: true, get: function () { return LogSeriesDistribution_1.LogSeriesDistribution; } });
// Multinomial distribution
var MultinomialDistribution_1 = require("./MultinomialDistribution");
Object.defineProperty(exports, "DEFAULT_MULTINOMIAL_PARAMETERS", { enumerable: true, get: function () { return MultinomialDistribution_1.DEFAULT_MULTINOMIAL_PARAMETERS; } });
Object.defineProperty(exports, "MULTINOMIAL_PARAMETER_METADATA", { enumerable: true, get: function () { return MultinomialDistribution_1.MULTINOMIAL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "MultinomialDistribution", { enumerable: true, get: function () { return MultinomialDistribution_1.MultinomialDistribution; } });
// NegativeBinomial distribution
var NegativeBinomialDistribution_1 = require("./NegativeBinomialDistribution");
Object.defineProperty(exports, "DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS", { enumerable: true, get: function () { return NegativeBinomialDistribution_1.DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS; } });
Object.defineProperty(exports, "NEGATIVE_BINOMIAL_PARAMETER_METADATA", { enumerable: true, get: function () { return NegativeBinomialDistribution_1.NEGATIVE_BINOMIAL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "NegativeBinomialDistribution", { enumerable: true, get: function () { return NegativeBinomialDistribution_1.NegativeBinomialDistribution; } });
// Normal distribution
var NormalDistribution_1 = require("./NormalDistribution");
Object.defineProperty(exports, "DEFAULT_NORMAL_PARAMETERS", { enumerable: true, get: function () { return NormalDistribution_1.DEFAULT_NORMAL_PARAMETERS; } });
Object.defineProperty(exports, "NORMAL_PARAMETER_METADATA", { enumerable: true, get: function () { return NormalDistribution_1.NORMAL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "NormalDistribution", { enumerable: true, get: function () { return NormalDistribution_1.NormalDistribution; } });
// Pareto distribution
var ParetoDistribution_1 = require("./ParetoDistribution");
Object.defineProperty(exports, "DEFAULT_PARETO_PARAMETERS", { enumerable: true, get: function () { return ParetoDistribution_1.DEFAULT_PARETO_PARAMETERS; } });
Object.defineProperty(exports, "PARETO_PARAMETER_METADATA", { enumerable: true, get: function () { return ParetoDistribution_1.PARETO_PARAMETER_METADATA; } });
Object.defineProperty(exports, "ParetoDistribution", { enumerable: true, get: function () { return ParetoDistribution_1.ParetoDistribution; } });
// Poisson distribution
var PoissonDistribution_1 = require("./PoissonDistribution");
Object.defineProperty(exports, "DEFAULT_POISSON_PARAMETERS", { enumerable: true, get: function () { return PoissonDistribution_1.DEFAULT_POISSON_PARAMETERS; } });
Object.defineProperty(exports, "POISSON_PARAMETER_METADATA", { enumerable: true, get: function () { return PoissonDistribution_1.POISSON_PARAMETER_METADATA; } });
Object.defineProperty(exports, "PoissonDistribution", { enumerable: true, get: function () { return PoissonDistribution_1.PoissonDistribution; } });
// Rayleigh distribution
var RayleighDistribution_1 = require("./RayleighDistribution");
Object.defineProperty(exports, "DEFAULT_RAYLEIGH_PARAMETERS", { enumerable: true, get: function () { return RayleighDistribution_1.DEFAULT_RAYLEIGH_PARAMETERS; } });
Object.defineProperty(exports, "RAYLEIGH_PARAMETER_METADATA", { enumerable: true, get: function () { return RayleighDistribution_1.RAYLEIGH_PARAMETER_METADATA; } });
Object.defineProperty(exports, "RayleighDistribution", { enumerable: true, get: function () { return RayleighDistribution_1.RayleighDistribution; } });
// T distribution
var TDistribution_1 = require("./TDistribution");
Object.defineProperty(exports, "DEFAULT_T_DISTRIBUTION_PARAMETERS", { enumerable: true, get: function () { return TDistribution_1.DEFAULT_T_DISTRIBUTION_PARAMETERS; } });
Object.defineProperty(exports, "T_DISTRIBUTION_PARAMETER_METADATA", { enumerable: true, get: function () { return TDistribution_1.T_DISTRIBUTION_PARAMETER_METADATA; } });
Object.defineProperty(exports, "TDistribution", { enumerable: true, get: function () { return TDistribution_1.TDistribution; } });
// Triangular distribution
var TriangularDistribution_1 = require("./TriangularDistribution");
Object.defineProperty(exports, "DEFAULT_TRIANGULAR_PARAMETERS", { enumerable: true, get: function () { return TriangularDistribution_1.DEFAULT_TRIANGULAR_PARAMETERS; } });
Object.defineProperty(exports, "TRIANGULAR_PARAMETER_METADATA", { enumerable: true, get: function () { return TriangularDistribution_1.TRIANGULAR_PARAMETER_METADATA; } });
Object.defineProperty(exports, "TriangularDistribution", { enumerable: true, get: function () { return TriangularDistribution_1.TriangularDistribution; } });
// Uniform distribution
var UniformDistribution_1 = require("./UniformDistribution");
Object.defineProperty(exports, "DEFAULT_UNIFORM_PARAMETERS", { enumerable: true, get: function () { return UniformDistribution_1.DEFAULT_UNIFORM_PARAMETERS; } });
Object.defineProperty(exports, "UNIFORM_PARAMETER_METADATA", { enumerable: true, get: function () { return UniformDistribution_1.UNIFORM_PARAMETER_METADATA; } });
Object.defineProperty(exports, "UniformDistribution", { enumerable: true, get: function () { return UniformDistribution_1.UniformDistribution; } });
// VonMises distribution
var VonMisesDistribution_1 = require("./VonMisesDistribution");
Object.defineProperty(exports, "DEFAULT_VON_MISES_PARAMETERS", { enumerable: true, get: function () { return VonMisesDistribution_1.DEFAULT_VON_MISES_PARAMETERS; } });
Object.defineProperty(exports, "VON_MISES_PARAMETER_METADATA", { enumerable: true, get: function () { return VonMisesDistribution_1.VON_MISES_PARAMETER_METADATA; } });
Object.defineProperty(exports, "VonMisesDistribution", { enumerable: true, get: function () { return VonMisesDistribution_1.VonMisesDistribution; } });
// Wald distribution
var WaldDistribution_1 = require("./WaldDistribution");
Object.defineProperty(exports, "DEFAULT_WALD_PARAMETERS", { enumerable: true, get: function () { return WaldDistribution_1.DEFAULT_WALD_PARAMETERS; } });
Object.defineProperty(exports, "WALD_PARAMETER_METADATA", { enumerable: true, get: function () { return WaldDistribution_1.WALD_PARAMETER_METADATA; } });
Object.defineProperty(exports, "WaldDistribution", { enumerable: true, get: function () { return WaldDistribution_1.WaldDistribution; } });
// Weibull distribution
var WeibullDistribution_1 = require("./WeibullDistribution");
Object.defineProperty(exports, "DEFAULT_WEIBULL_PARAMETERS", { enumerable: true, get: function () { return WeibullDistribution_1.DEFAULT_WEIBULL_PARAMETERS; } });
Object.defineProperty(exports, "WEIBULL_PARAMETER_METADATA", { enumerable: true, get: function () { return WeibullDistribution_1.WEIBULL_PARAMETER_METADATA; } });
Object.defineProperty(exports, "WeibullDistribution", { enumerable: true, get: function () { return WeibullDistribution_1.WeibullDistribution; } });
// Zipf distribution
var ZipfDistribution_1 = require("./ZipfDistribution");
Object.defineProperty(exports, "DEFAULT_ZIPF_PARAMETERS", { enumerable: true, get: function () { return ZipfDistribution_1.DEFAULT_ZIPF_PARAMETERS; } });
Object.defineProperty(exports, "ZIPF_PARAMETER_METADATA", { enumerable: true, get: function () { return ZipfDistribution_1.ZIPF_PARAMETER_METADATA; } });
Object.defineProperty(exports, "ZipfDistribution", { enumerable: true, get: function () { return ZipfDistribution_1.ZipfDistribution; } });
// Distribution factory utilities
var DistributionFactory_1 = require("./DistributionFactory");
Object.defineProperty(exports, "createDefaultDistribution", { enumerable: true, get: function () { return DistributionFactory_1.createDefaultDistribution; } });
Object.defineProperty(exports, "getDistributionEffectiveValue", { enumerable: true, get: function () { return DistributionFactory_1.getDistributionEffectiveValue; } });
Object.defineProperty(exports, "validateDistributionParameters", { enumerable: true, get: function () { return DistributionFactory_1.validateDistributionParameters; } });
// Import DistributionType for mapping functions
var DistributionType_1 = require("../DistributionType");
// Re-export getDistributionDisplayName and isDistributionTypeSupported from DistributionType
var DistributionType_2 = require("../DistributionType");
Object.defineProperty(exports, "getDistributionDisplayName", { enumerable: true, get: function () { return DistributionType_2.getDistributionDisplayName; } });
Object.defineProperty(exports, "isDistributionTypeSupported", { enumerable: true, get: function () { return DistributionType_2.isDistributionTypeSupported; } });
/**
 * Core numeric distributions supported for NUMBER state SAMPLE operations.
 * This is the initial set - can be expanded later.
 */
exports.CORE_NUMERIC_DISTRIBUTIONS = [
    DistributionType_1.DistributionType.CONSTANT,
    DistributionType_1.DistributionType.UNIFORM,
    DistributionType_1.DistributionType.TRIANGULAR,
    DistributionType_1.DistributionType.NORMAL,
    DistributionType_1.DistributionType.EXPONENTIAL
];
/**
 * Convert DistributionType enum to backend string format.
 * Since the enum values are already lowercase strings, this is a direct return.
 *
 * @param type The DistributionType enum value
 * @returns The backend-compatible string representation
 */
function distributionTypeToBackendString(type) {
    return type; // Enum values are already the backend string format
}
exports.distributionTypeToBackendString = distributionTypeToBackendString;
/**
 * Convert backend string to DistributionType enum.
 *
 * @param str The backend string representation
 * @returns The DistributionType enum value, or null if not found
 */
function backendStringToDistributionType(str) {
    // Check if the string is a valid DistributionType value
    var values = Object.values(DistributionType_1.DistributionType);
    if (values.includes(str)) {
        return str;
    }
    return null;
}
exports.backendStringToDistributionType = backendStringToDistributionType;
/**
 * Check if a distribution type is a core numeric distribution.
 *
 * @param type The DistributionType to check
 * @returns True if it's in the core set
 */
function isCoreNumericDistribution(type) {
    return exports.CORE_NUMERIC_DISTRIBUTIONS.includes(type);
}
exports.isCoreNumericDistribution = isCoreNumericDistribution;
