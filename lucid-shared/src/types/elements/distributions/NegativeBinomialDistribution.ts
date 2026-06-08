import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a NEGATIVE_BINOMIAL distribution type.
 */
export interface NegativeBinomialParameters {
    n: number;
    p: number;
}

/**
 * Default parameters for NEGATIVE_BINOMIAL distribution.
 */
export const DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS: NegativeBinomialParameters = {
    n: 5,
    p: 0.5
};

/**
 * Metadata for NegativeBinomialParameters fields.
 */
export const NEGATIVE_BINOMIAL_PARAMETER_METADATA: Record<keyof NegativeBinomialParameters, ParameterMetadata> = {
    n: {
        label: "N",
        description: "The number of successes",
        min: 1,
        step: 1
    },
    p: {
        label: "P",
        description: "The probability of success in a single trial",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Negative Binomial distributions
 */
export class NegativeBinomialDistribution {
    /**
     * Creates a default NEGATIVE_BINOMIAL distribution
     */
    static createDefault(): Distribution {
        return NegativeBinomialDistribution.create(
            DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS.n,
            DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS.p
        );
    }
    
    /**
     * Creates a NEGATIVE_BINOMIAL distribution with the specified parameters
     */
    static create(n: number, p: number): Distribution {
        return new Distribution(
            DistributionType.NEGATIVE_BINOMIAL,
            { n, p } as NegativeBinomialParameters
        );
    }
    
    /**
     * Validates NEGATIVE_BINOMIAL distribution parameters
     */
    static validateParameters(params: NegativeBinomialParameters): boolean {
        return (
            typeof params.n === 'number' &&
            typeof params.p === 'number' &&
            params.n >= 1 &&
            params.n === Math.floor(params.n) &&
            params.p > 0 &&
            params.p <= 1
        );
    }
    
    /**
     * Gets the effective value of a NEGATIVE_BINOMIAL distribution (mean)
     */
    static getEffectiveValue(params: NegativeBinomialParameters): number {
        return params.n / params.p;
    }
}
