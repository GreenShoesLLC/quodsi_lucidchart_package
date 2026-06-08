import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a NORMAL distribution type.
 * This represents a normal (Gaussian) distribution.
 */
export interface NormalParameters {
    /**
     * The mean (average) of the normal distribution.
     */
    mean: number;
    
    /**
     * The standard deviation of the normal distribution.
     */
    std: number;
}

/**
 * Default parameters for NORMAL distribution.
 */
export const DEFAULT_NORMAL_PARAMETERS: NormalParameters = {
    mean: 5,
    std: 1
};

/**
 * Metadata for NormalParameters fields.
 */
export const NORMAL_PARAMETER_METADATA: Record<keyof NormalParameters, ParameterMetadata> = {
    mean: {
        label: "Mean",
        description: "The average value of the normal distribution",
        min: 0,
        step: 0.1
    },
    std: {
        label: "Standard Deviation",
        description: "The standard deviation of the normal distribution",
        min: 0.1,
        step: 0.1
    }
};

/**
 * Functions for working with Normal distributions
 */
export class NormalDistribution {
    /**
     * Creates a default NORMAL distribution
     */
    static createDefault(): Distribution {
        return NormalDistribution.create(
            DEFAULT_NORMAL_PARAMETERS.mean,
            DEFAULT_NORMAL_PARAMETERS.std
        );
    }
    
    /**
     * Creates a NORMAL distribution with the specified parameters
     */
    static create(mean: number, std: number): Distribution {
        return new Distribution(
            DistributionType.NORMAL,
            { mean, std } as NormalParameters
        );
    }
    
    /**
     * Validates NORMAL distribution parameters
     */
    static validateParameters(params: NormalParameters): boolean {
        return (
            typeof params.mean === 'number' &&
            typeof params.std === 'number' &&
            params.mean >= 0 &&
            params.std > 0
        );
    }
    
    /**
     * Gets the effective value of a NORMAL distribution (mean)
     */
    static getEffectiveValue(params: NormalParameters): number {
        return params.mean;
    }
}
