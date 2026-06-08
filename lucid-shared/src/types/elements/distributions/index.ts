/**
 * Re-export all distribution types
 */

// Parameter metadata interface (common to all distributions)
export { ParameterMetadata } from './ConstantDistribution';

// Bernoulli distribution
export { 
    BernoulliParameters,
    DEFAULT_BERNOULLI_PARAMETERS,
    BERNOULLI_PARAMETER_METADATA,
    BernoulliDistribution
} from './BernoulliDistribution';

// Beta distribution
export { 
    BetaParameters,
    DEFAULT_BETA_PARAMETERS,
    BETA_PARAMETER_METADATA,
    BetaDistribution
} from './BetaDistribution';

// Binomial distribution
export { 
    BinomialParameters,
    DEFAULT_BINOMIAL_PARAMETERS,
    BINOMIAL_PARAMETER_METADATA,
    BinomialDistribution
} from './BinomialDistribution';

// ChiSquare distribution
export { 
    ChiSquareParameters,
    DEFAULT_CHI_SQUARE_PARAMETERS,
    CHI_SQUARE_PARAMETER_METADATA,
    ChiSquareDistribution
} from './ChiSquareDistribution';

// Constant distribution
export { 
    ConstantParameters,
    DEFAULT_CONSTANT_PARAMETERS,
    CONSTANT_PARAMETER_METADATA,
    ConstantDistribution
} from './ConstantDistribution';

// Discrete distribution
export { 
    DiscreteParameters,
    DEFAULT_DISCRETE_PARAMETERS,
    DISCRETE_PARAMETER_METADATA,
    DiscreteDistribution
} from './DiscreteDistribution';

// Exponential distribution
export { 
    ExponentialParameters,
    DEFAULT_EXPONENTIAL_PARAMETERS,
    EXPONENTIAL_PARAMETER_METADATA,
    ExponentialDistribution
} from './ExponentialDistribution';

// F distribution
export { 
    FDistributionParameters,
    DEFAULT_F_DISTRIBUTION_PARAMETERS,
    F_DISTRIBUTION_PARAMETER_METADATA,
    FDistribution
} from './FDistribution';

// Gamma distribution
export { 
    GammaParameters,
    DEFAULT_GAMMA_PARAMETERS,
    GAMMA_PARAMETER_METADATA,
    GammaDistribution
} from './GammaDistribution';

// Geometric distribution
export { 
    GeometricParameters,
    DEFAULT_GEOMETRIC_PARAMETERS,
    GEOMETRIC_PARAMETER_METADATA,
    GeometricDistribution
} from './GeometricDistribution';

// Hypergeometric distribution
export { 
    HypergeometricParameters,
    DEFAULT_HYPERGEOMETRIC_PARAMETERS,
    HYPERGEOMETRIC_PARAMETER_METADATA,
    HypergeometricDistribution
} from './HypergeometricDistribution';

// Laplace distribution
export { 
    LaplaceParameters,
    DEFAULT_LAPLACE_PARAMETERS,
    LAPLACE_PARAMETER_METADATA,
    LaplaceDistribution
} from './LaplaceDistribution';

// Logistic distribution
export { 
    LogisticParameters,
    DEFAULT_LOGISTIC_PARAMETERS,
    LOGISTIC_PARAMETER_METADATA,
    LogisticDistribution
} from './LogisticDistribution';

// Lognormal distribution
export { 
    LognormalParameters,
    DEFAULT_LOGNORMAL_PARAMETERS,
    LOGNORMAL_PARAMETER_METADATA,
    LognormalDistribution
} from './LognormalDistribution';

// LogSeries distribution
export { 
    LogSeriesParameters,
    DEFAULT_LOG_SERIES_PARAMETERS,
    LOG_SERIES_PARAMETER_METADATA,
    LogSeriesDistribution
} from './LogSeriesDistribution';

// Multinomial distribution
export { 
    MultinomialParameters,
    DEFAULT_MULTINOMIAL_PARAMETERS,
    MULTINOMIAL_PARAMETER_METADATA,
    MultinomialDistribution
} from './MultinomialDistribution';

// NegativeBinomial distribution
export { 
    NegativeBinomialParameters,
    DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS,
    NEGATIVE_BINOMIAL_PARAMETER_METADATA,
    NegativeBinomialDistribution
} from './NegativeBinomialDistribution';

// Normal distribution
export { 
    NormalParameters,
    DEFAULT_NORMAL_PARAMETERS,
    NORMAL_PARAMETER_METADATA,
    NormalDistribution
} from './NormalDistribution';

// Pareto distribution
export { 
    ParetoParameters,
    DEFAULT_PARETO_PARAMETERS,
    PARETO_PARAMETER_METADATA,
    ParetoDistribution
} from './ParetoDistribution';

// Poisson distribution
export { 
    PoissonParameters,
    DEFAULT_POISSON_PARAMETERS,
    POISSON_PARAMETER_METADATA,
    PoissonDistribution
} from './PoissonDistribution';

// Rayleigh distribution
export { 
    RayleighParameters,
    DEFAULT_RAYLEIGH_PARAMETERS,
    RAYLEIGH_PARAMETER_METADATA,
    RayleighDistribution
} from './RayleighDistribution';

// T distribution
export { 
    TDistributionParameters,
    DEFAULT_T_DISTRIBUTION_PARAMETERS,
    T_DISTRIBUTION_PARAMETER_METADATA,
    TDistribution
} from './TDistribution';

// Triangular distribution
export { 
    TriangularParameters,
    DEFAULT_TRIANGULAR_PARAMETERS,
    TRIANGULAR_PARAMETER_METADATA,
    TriangularDistribution
} from './TriangularDistribution';

// Uniform distribution
export { 
    UniformParameters,
    DEFAULT_UNIFORM_PARAMETERS,
    UNIFORM_PARAMETER_METADATA,
    UniformDistribution
} from './UniformDistribution';

// VonMises distribution
export { 
    VonMisesParameters,
    DEFAULT_VON_MISES_PARAMETERS,
    VON_MISES_PARAMETER_METADATA,
    VonMisesDistribution
} from './VonMisesDistribution';

// Wald distribution
export { 
    WaldParameters,
    DEFAULT_WALD_PARAMETERS,
    WALD_PARAMETER_METADATA,
    WaldDistribution
} from './WaldDistribution';

// Weibull distribution
export { 
    WeibullParameters,
    DEFAULT_WEIBULL_PARAMETERS,
    WEIBULL_PARAMETER_METADATA,
    WeibullDistribution
} from './WeibullDistribution';

// Zipf distribution
export { 
    ZipfParameters,
    DEFAULT_ZIPF_PARAMETERS,
    ZIPF_PARAMETER_METADATA,
    ZipfDistribution
} from './ZipfDistribution';

// Distribution factory utilities
export {
    createDefaultDistribution,
    getDistributionEffectiveValue,
    validateDistributionParameters
} from './DistributionFactory';

// Import DistributionType for mapping functions
import { DistributionType } from '@quodsi/shared';

// Re-export getDistributionDisplayName and isDistributionTypeSupported from DistributionType
export { getDistributionDisplayName, isDistributionTypeSupported } from '@quodsi/shared';

/**
 * Core numeric distributions supported for NUMBER state SAMPLE operations.
 * This is the initial set - can be expanded later.
 */
export const CORE_NUMERIC_DISTRIBUTIONS: DistributionType[] = [
    DistributionType.CONSTANT,
    DistributionType.UNIFORM,
    DistributionType.TRIANGULAR,
    DistributionType.NORMAL,
    DistributionType.EXPONENTIAL
];

/**
 * Convert DistributionType enum to backend string format.
 * Since the enum values are already lowercase strings, this is a direct return.
 *
 * @param type The DistributionType enum value
 * @returns The backend-compatible string representation
 */
export function distributionTypeToBackendString(type: DistributionType): string {
    return type; // Enum values are already the backend string format
}

/**
 * Convert backend string to DistributionType enum.
 *
 * @param str The backend string representation
 * @returns The DistributionType enum value, or null if not found
 */
export function backendStringToDistributionType(str: string): DistributionType | null {
    // Check if the string is a valid DistributionType value
    const values = Object.values(DistributionType);
    if (values.includes(str as DistributionType)) {
        return str as DistributionType;
    }
    return null;
}

/**
 * Check if a distribution type is a core numeric distribution.
 *
 * @param type The DistributionType to check
 * @returns True if it's in the core set
 */
export function isCoreNumericDistribution(type: DistributionType): boolean {
    return CORE_NUMERIC_DISTRIBUTIONS.includes(type);
}
