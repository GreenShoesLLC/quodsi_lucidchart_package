export enum DistributionType {
    CONSTANT = "constant", // Add CONSTANT as first option
    MULTINOMIAL = "multinomial",
    UNIFORM = "uniform",
    TRIANGULAR = "triangular",
    EXPONENTIAL = "exponential",
    NORMAL = "normal",
    LOGNORMAL = "lognormal",
    BETA = "beta",
    GAMMA = "gamma",
    WEIBULL = "weibull",
    DISCRETE = "discrete",
    POISSON = "poisson",
    BINOMIAL = "binomial",
    BERNOULLI = "bernoulli",
    GEOMETRIC = "geometric",
    NEGATIVE_BINOMIAL = "negative_binomial",
    SAMPLE_MULTINOMIAL = "sample_multinomial",
    SAMPLE_MULTINOMIAL_ONE = "sample_multinomial_one",
    PROBABILITY_VALUES = "probability_values",
    SAMPLE_NEXT_SERVICE_INDEX = "sample_next_service_index",
    CHI_SQUARE = "chisquare",
    F_DISTRIBUTION = "f_distribution",
    HYPERGEOMETRIC = "hypergeometric",
    LAPLACE = "laplace",
    LOGISTIC = "logistic",
    LOG_SERIES = "logseries",
    PARETO = "pareto",
    RAYLEIGH = "rayleigh",
    T_DISTRIBUTION = "t_distribution",
    VON_MISES = "vonmises",
    WALD = "wald",
    ZIPF = "zipf"
}

// Add helper for display names
export function getDistributionDisplayName(type: DistributionType): string {
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
                .replace(/\b\w/g, char => char.toUpperCase());
    }
}

// Add helper for determining if a distribution is supported in the UI
export function isDistributionTypeSupported(type: DistributionType): boolean {
    const supportedTypes = [
        DistributionType.CONSTANT,
        DistributionType.UNIFORM,
        DistributionType.TRIANGULAR, 
        DistributionType.NORMAL
    ];
    
    return supportedTypes.includes(type);
}

