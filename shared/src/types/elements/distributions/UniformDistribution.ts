import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a UNIFORM distribution type.
 * This represents a distribution with equal probability between low and high.
 */
export interface UniformParameters {
    /**
     * The lower bound of the uniform distribution.
     */
    low: number;
    
    /**
     * The upper bound of the uniform distribution.
     */
    high: number;
}

/**
 * Default parameters for UNIFORM distribution.
 */
export const DEFAULT_UNIFORM_PARAMETERS: UniformParameters = {
    low: 0,
    high: 10
};

/**
 * Metadata for UniformParameters fields.
 */
export const UNIFORM_PARAMETER_METADATA: Record<keyof UniformParameters, ParameterMetadata> = {
    low: {
        label: "Minimum",
        description: "The minimum value of the uniform distribution",
        min: 0,
        step: 0.1
    },
    high: {
        label: "Maximum",
        description: "The maximum value of the uniform distribution",
        min: 0,
        step: 0.1
    }
};

/**
 * Functions for working with Uniform distributions
 */
export class UniformDistribution {
    /**
     * Creates a default UNIFORM distribution
     */
    static createDefault(): Distribution {
        return UniformDistribution.create(
            DEFAULT_UNIFORM_PARAMETERS.low, 
            DEFAULT_UNIFORM_PARAMETERS.high
        );
    }
    
    /**
     * Creates a UNIFORM distribution with the specified parameters
     */
    static create(low: number, high: number): Distribution {
        return new Distribution(
            DistributionType.UNIFORM,
            { low, high } as UniformParameters
        );
    }
    
    /**
     * Validates UNIFORM distribution parameters
     */
    static validateParameters(params: UniformParameters): boolean {
        return (
            typeof params.low === 'number' &&
            typeof params.high === 'number' &&
            params.low >= 0 &&
            params.high > params.low
        );
    }
    
    /**
     * Gets the effective value of a UNIFORM distribution (mean)
     */
    static getEffectiveValue(params: UniformParameters): number {
        return (params.low + params.high) / 2;
    }
}
