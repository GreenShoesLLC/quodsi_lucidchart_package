import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a BINOMIAL distribution type.
 */
export interface BinomialParameters {
    n: number;
    p: number;
}

/**
 * Default parameters for BINOMIAL distribution.
 */
export const DEFAULT_BINOMIAL_PARAMETERS: BinomialParameters = {
    n: 10,
    p: 0.5
};

/**
 * Metadata for BinomialParameters fields.
 */
export const BINOMIAL_PARAMETER_METADATA: Record<keyof BinomialParameters, ParameterMetadata> = {
    n: {
        label: "N",
        description: "The number of trials",
        min: 1,
        step: 1
    },
    p: {
        label: "P",
        description: "The success probability of a single trial",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Binomial distributions
 */
export class BinomialDistribution {
    /**
     * Creates a default BINOMIAL distribution
     */
    static createDefault(): Distribution {
        return BinomialDistribution.create(
            DEFAULT_BINOMIAL_PARAMETERS.n,
            DEFAULT_BINOMIAL_PARAMETERS.p
        );
    }
    
    /**
     * Creates a BINOMIAL distribution with the specified parameters
     */
    static create(n: number, p: number): Distribution {
        return new Distribution(
            DistributionType.BINOMIAL,
            { n, p } as BinomialParameters
        );
    }
    
    /**
     * Validates BINOMIAL distribution parameters
     */
    static validateParameters(params: BinomialParameters): boolean {
        return (
            typeof params.n === 'number' &&
            typeof params.p === 'number' &&
            params.n >= 1 &&
            params.n === Math.floor(params.n) &&
            params.p >= 0 &&
            params.p <= 1
        );
    }
    
    /**
     * Gets the effective value of a BINOMIAL distribution (mean)
     */
    static getEffectiveValue(params: BinomialParameters): number {
        return params.n * params.p;
    }
}
