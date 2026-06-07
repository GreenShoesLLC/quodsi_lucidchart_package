import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a MULTINOMIAL distribution type.
 */
export interface MultinomialParameters {
    n: number;
    pvals: number[];
}

/**
 * Default parameters for MULTINOMIAL distribution.
 */
export const DEFAULT_MULTINOMIAL_PARAMETERS: MultinomialParameters = {
    n: 1,
    pvals: [0.5, 0.5]
};

/**
 * Metadata for MultinomialParameters fields.
 */
export const MULTINOMIAL_PARAMETER_METADATA: Record<keyof MultinomialParameters, ParameterMetadata> = {
    n: {
        label: "N",
        description: "The number of trials",
        min: 1,
        step: 1
    },
    pvals: {
        label: "Probability Values",
        description: "The probability values (must sum to 1)",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Multinomial distributions
 */
export class MultinomialDistribution {
    /**
     * Creates a default MULTINOMIAL distribution
     */
    static createDefault(): Distribution {
        return MultinomialDistribution.create(
            DEFAULT_MULTINOMIAL_PARAMETERS.n,
            DEFAULT_MULTINOMIAL_PARAMETERS.pvals
        );
    }
    
    /**
     * Creates a MULTINOMIAL distribution with the specified parameters
     */
    static create(n: number, pvals: number[]): Distribution {
        return new Distribution(
            DistributionType.MULTINOMIAL,
            { n, pvals } as MultinomialParameters
        );
    }
    
    /**
     * Validates MULTINOMIAL distribution parameters
     */
    static validateParameters(params: MultinomialParameters): boolean {
        if (typeof params.n !== 'number' || params.n < 1) {
            return false;
        }
        
        if (!Array.isArray(params.pvals) || params.pvals.length < 2) {
            return false;
        }
        
        // All values must be between 0 and 1
        if (params.pvals.some(p => typeof p !== 'number' || p < 0 || p > 1)) {
            return false;
        }
        
        // Values should sum to approximately 1
        const sum = params.pvals.reduce((acc, val) => acc + val, 0);
        return Math.abs(sum - 1) < 0.0001;
    }
    
    /**
     * Gets the effective value of a MULTINOMIAL distribution
     */
    static getEffectiveValue(params: MultinomialParameters): number {
        return params.n;
    }
}
