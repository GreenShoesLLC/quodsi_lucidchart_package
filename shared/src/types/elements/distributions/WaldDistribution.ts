import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a WALD distribution type.
 */
export interface WaldParameters {
    mean: number;
    scale: number;
}

/**
 * Default parameters for WALD distribution.
 */
export const DEFAULT_WALD_PARAMETERS: WaldParameters = {
    mean: 1,
    scale: 1
};

/**
 * Metadata for WaldParameters fields.
 */
export const WALD_PARAMETER_METADATA: Record<keyof WaldParameters, ParameterMetadata> = {
    mean: {
        label: "Mean",
        description: "The mean parameter",
        min: 0.01,
        step: 0.1
    },
    scale: {
        label: "Scale",
        description: "The scale parameter",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Wald distributions
 */
export class WaldDistribution {
    /**
     * Creates a default WALD distribution
     */
    static createDefault(): Distribution {
        return WaldDistribution.create(
            DEFAULT_WALD_PARAMETERS.mean,
            DEFAULT_WALD_PARAMETERS.scale
        );
    }
    
    /**
     * Creates a WALD distribution with the specified parameters
     */
    static create(mean: number, scale: number): Distribution {
        return new Distribution(
            DistributionType.WALD,
            { mean, scale } as WaldParameters
        );
    }
    
    /**
     * Validates WALD distribution parameters
     */
    static validateParameters(params: WaldParameters): boolean {
        return (
            typeof params.mean === 'number' &&
            typeof params.scale === 'number' &&
            params.mean > 0 &&
            params.scale > 0
        );
    }
    
    /**
     * Gets the effective value of a WALD distribution (mean)
     */
    static getEffectiveValue(params: WaldParameters): number {
        return params.mean;
    }
}
