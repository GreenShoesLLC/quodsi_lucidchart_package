import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a DISCRETE distribution type.
 */
export interface DiscreteParameters {
    pvals: number[];
}

/**
 * Default parameters for DISCRETE distribution.
 */
export const DEFAULT_DISCRETE_PARAMETERS: DiscreteParameters = {
    pvals: [0.5, 0.5]
};

/**
 * Metadata for DiscreteParameters fields.
 */
export const DISCRETE_PARAMETER_METADATA: Record<keyof DiscreteParameters, ParameterMetadata> = {
    pvals: {
        label: "Probability Values",
        description: "The probability values (must sum to 1)",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Discrete distributions
 */
export class DiscreteDistribution {
    /**
     * Creates a default DISCRETE distribution
     */
    static createDefault(): Distribution {
        return DiscreteDistribution.create(DEFAULT_DISCRETE_PARAMETERS.pvals);
    }
    
    /**
     * Creates a DISCRETE distribution with the specified parameters
     */
    static create(pvals: number[]): Distribution {
        return new Distribution(
            DistributionType.DISCRETE,
            { pvals } as DiscreteParameters
        );
    }
    
    /**
     * Validates DISCRETE distribution parameters
     */
    static validateParameters(params: DiscreteParameters): boolean {
        if (!Array.isArray(params.pvals) || params.pvals.length < 1) {
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
     * Gets the effective value of a DISCRETE distribution
     * Returns the expected value (sum of index * probability)
     */
    static getEffectiveValue(params: DiscreteParameters): number {
        if (params.pvals.length === 0) {
            return 0;
        }
        
        return params.pvals.reduce((acc, val, idx) => acc + val * idx, 0);
    }
}
