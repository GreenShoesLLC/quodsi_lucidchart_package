/**
 * Re-export all distribution types
 */
export { ParameterMetadata } from './ConstantDistribution';
export { BernoulliParameters, DEFAULT_BERNOULLI_PARAMETERS, BERNOULLI_PARAMETER_METADATA, BernoulliDistribution } from './BernoulliDistribution';
export { BetaParameters, DEFAULT_BETA_PARAMETERS, BETA_PARAMETER_METADATA, BetaDistribution } from './BetaDistribution';
export { BinomialParameters, DEFAULT_BINOMIAL_PARAMETERS, BINOMIAL_PARAMETER_METADATA, BinomialDistribution } from './BinomialDistribution';
export { ChiSquareParameters, DEFAULT_CHI_SQUARE_PARAMETERS, CHI_SQUARE_PARAMETER_METADATA, ChiSquareDistribution } from './ChiSquareDistribution';
export { ConstantParameters, DEFAULT_CONSTANT_PARAMETERS, CONSTANT_PARAMETER_METADATA, ConstantDistribution } from './ConstantDistribution';
export { DiscreteParameters, DEFAULT_DISCRETE_PARAMETERS, DISCRETE_PARAMETER_METADATA, DiscreteDistribution } from './DiscreteDistribution';
export { ExponentialParameters, DEFAULT_EXPONENTIAL_PARAMETERS, EXPONENTIAL_PARAMETER_METADATA, ExponentialDistribution } from './ExponentialDistribution';
export { FDistributionParameters, DEFAULT_F_DISTRIBUTION_PARAMETERS, F_DISTRIBUTION_PARAMETER_METADATA, FDistribution } from './FDistribution';
export { GammaParameters, DEFAULT_GAMMA_PARAMETERS, GAMMA_PARAMETER_METADATA, GammaDistribution } from './GammaDistribution';
export { GeometricParameters, DEFAULT_GEOMETRIC_PARAMETERS, GEOMETRIC_PARAMETER_METADATA, GeometricDistribution } from './GeometricDistribution';
export { HypergeometricParameters, DEFAULT_HYPERGEOMETRIC_PARAMETERS, HYPERGEOMETRIC_PARAMETER_METADATA, HypergeometricDistribution } from './HypergeometricDistribution';
export { LaplaceParameters, DEFAULT_LAPLACE_PARAMETERS, LAPLACE_PARAMETER_METADATA, LaplaceDistribution } from './LaplaceDistribution';
export { LogisticParameters, DEFAULT_LOGISTIC_PARAMETERS, LOGISTIC_PARAMETER_METADATA, LogisticDistribution } from './LogisticDistribution';
export { LognormalParameters, DEFAULT_LOGNORMAL_PARAMETERS, LOGNORMAL_PARAMETER_METADATA, LognormalDistribution } from './LognormalDistribution';
export { LogSeriesParameters, DEFAULT_LOG_SERIES_PARAMETERS, LOG_SERIES_PARAMETER_METADATA, LogSeriesDistribution } from './LogSeriesDistribution';
export { MultinomialParameters, DEFAULT_MULTINOMIAL_PARAMETERS, MULTINOMIAL_PARAMETER_METADATA, MultinomialDistribution } from './MultinomialDistribution';
export { NegativeBinomialParameters, DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS, NEGATIVE_BINOMIAL_PARAMETER_METADATA, NegativeBinomialDistribution } from './NegativeBinomialDistribution';
export { NormalParameters, DEFAULT_NORMAL_PARAMETERS, NORMAL_PARAMETER_METADATA, NormalDistribution } from './NormalDistribution';
export { ParetoParameters, DEFAULT_PARETO_PARAMETERS, PARETO_PARAMETER_METADATA, ParetoDistribution } from './ParetoDistribution';
export { PoissonParameters, DEFAULT_POISSON_PARAMETERS, POISSON_PARAMETER_METADATA, PoissonDistribution } from './PoissonDistribution';
export { RayleighParameters, DEFAULT_RAYLEIGH_PARAMETERS, RAYLEIGH_PARAMETER_METADATA, RayleighDistribution } from './RayleighDistribution';
export { TDistributionParameters, DEFAULT_T_DISTRIBUTION_PARAMETERS, T_DISTRIBUTION_PARAMETER_METADATA, TDistribution } from './TDistribution';
export { TriangularParameters, DEFAULT_TRIANGULAR_PARAMETERS, TRIANGULAR_PARAMETER_METADATA, TriangularDistribution } from './TriangularDistribution';
export { UniformParameters, DEFAULT_UNIFORM_PARAMETERS, UNIFORM_PARAMETER_METADATA, UniformDistribution } from './UniformDistribution';
export { VonMisesParameters, DEFAULT_VON_MISES_PARAMETERS, VON_MISES_PARAMETER_METADATA, VonMisesDistribution } from './VonMisesDistribution';
export { WaldParameters, DEFAULT_WALD_PARAMETERS, WALD_PARAMETER_METADATA, WaldDistribution } from './WaldDistribution';
export { WeibullParameters, DEFAULT_WEIBULL_PARAMETERS, WEIBULL_PARAMETER_METADATA, WeibullDistribution } from './WeibullDistribution';
export { ZipfParameters, DEFAULT_ZIPF_PARAMETERS, ZIPF_PARAMETER_METADATA, ZipfDistribution } from './ZipfDistribution';
export { createDefaultDistribution, getDistributionEffectiveValue, validateDistributionParameters } from './DistributionFactory';
import { DistributionType } from '../DistributionType';
export { getDistributionDisplayName, isDistributionTypeSupported } from '../DistributionType';
/**
 * Core numeric distributions supported for NUMBER state SAMPLE operations.
 * This is the initial set - can be expanded later.
 */
export declare const CORE_NUMERIC_DISTRIBUTIONS: DistributionType[];
/**
 * Convert DistributionType enum to backend string format.
 * Since the enum values are already lowercase strings, this is a direct return.
 *
 * @param type The DistributionType enum value
 * @returns The backend-compatible string representation
 */
export declare function distributionTypeToBackendString(type: DistributionType): string;
/**
 * Convert backend string to DistributionType enum.
 *
 * @param str The backend string representation
 * @returns The DistributionType enum value, or null if not found
 */
export declare function backendStringToDistributionType(str: string): DistributionType | null;
/**
 * Check if a distribution type is a core numeric distribution.
 *
 * @param type The DistributionType to check
 * @returns True if it's in the core set
 */
export declare function isCoreNumericDistribution(type: DistributionType): boolean;
//# sourceMappingURL=index.d.ts.map