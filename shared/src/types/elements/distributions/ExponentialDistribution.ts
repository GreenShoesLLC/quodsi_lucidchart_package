import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for an EXPONENTIAL distribution type.
 */
export interface ExponentialParameters {
    scale: number;
}

/**
 * Default parameters for EXPONENTIAL distribution.
 */
export const DEFAULT_EXPONENTIAL_PARAMETERS: ExponentialParameters = {
    scale: 1
};

/**
 * Metadata for ExponentialParameters fields.
 */
export const EXPONENTIAL_PARAMETER_METADATA: Record<keyof ExponentialParameters, ParameterMetadata> = {
    scale: {
        label: "Scale",
        description: "The scale parameter of the exponential distribution (1/lambda)",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Exponential distributions
 */
export class ExponentialDistribution {
    /**
     * Creates a default EXPONENTIAL distribution
     */
    static createDefault(): Distribution {
        return ExponentialDistribution.create(DEFAULT_EXPONENTIAL_PARAMETERS.scale);
    }
    
    /**
     * Creates an EXPONENTIAL distribution with the specified scale
     */
    static create(scale: number): Distribution {
        return new Distribution(
            DistributionType.EXPONENTIAL,
            { scale } as ExponentialParameters
        );
    }
    
    /**
     * Validates EXPONENTIAL distribution parameters
     */
    static validateParameters(params: ExponentialParameters): boolean {
        return typeof params.scale === 'number' && params.scale > 0;
    }
    
    /**
     * Gets the effective value of an EXPONENTIAL distribution (mean)
     */
    static getEffectiveValue(params: ExponentialParameters): number {
        return params.scale;
    }
}
