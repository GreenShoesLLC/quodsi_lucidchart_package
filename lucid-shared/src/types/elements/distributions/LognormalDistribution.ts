import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a LOGNORMAL distribution type.
 */
export interface LognormalParameters {
    mean: number;
    sigma: number;
}

/**
 * Default parameters for LOGNORMAL distribution.
 */
export const DEFAULT_LOGNORMAL_PARAMETERS: LognormalParameters = {
    mean: 0,
    sigma: 1
};

/**
 * Metadata for LognormalParameters fields.
 */
export const LOGNORMAL_PARAMETER_METADATA: Record<keyof LognormalParameters, ParameterMetadata> = {
    mean: {
        label: "Mean",
        description: "The mean of the underlying normal distribution",
        step: 0.1
    },
    sigma: {
        label: "Sigma",
        description: "The standard deviation of the underlying normal distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Lognormal distributions
 */
export class LognormalDistribution {
    /**
     * Creates a default LOGNORMAL distribution
     */
    static createDefault(): Distribution {
        return LognormalDistribution.create(
            DEFAULT_LOGNORMAL_PARAMETERS.mean,
            DEFAULT_LOGNORMAL_PARAMETERS.sigma
        );
    }
    
    /**
     * Creates a LOGNORMAL distribution with the specified parameters
     */
    static create(mean: number, sigma: number): Distribution {
        return new Distribution(
            DistributionType.LOGNORMAL,
            { mean, sigma } as LognormalParameters
        );
    }
    
    /**
     * Validates LOGNORMAL distribution parameters
     */
    static validateParameters(params: LognormalParameters): boolean {
        return (
            typeof params.mean === 'number' &&
            typeof params.sigma === 'number' &&
            params.sigma > 0
        );
    }
    
    /**
     * Gets the effective value of a LOGNORMAL distribution (median)
     */
    static getEffectiveValue(params: LognormalParameters): number {
        // The median of a lognormal distribution is exp(mu)
        return Math.exp(params.mean);
    }
}
