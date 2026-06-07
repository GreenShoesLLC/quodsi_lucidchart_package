import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a RAYLEIGH distribution type.
 */
export interface RayleighParameters {
    scale: number;
}

/**
 * Default parameters for RAYLEIGH distribution.
 */
export const DEFAULT_RAYLEIGH_PARAMETERS: RayleighParameters = {
    scale: 1
};

/**
 * Metadata for RayleighParameters fields.
 */
export const RAYLEIGH_PARAMETER_METADATA: Record<keyof RayleighParameters, ParameterMetadata> = {
    scale: {
        label: "Scale",
        description: "The scale parameter of the Rayleigh distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Rayleigh distributions
 */
export class RayleighDistribution {
    /**
     * Creates a default RAYLEIGH distribution
     */
    static createDefault(): Distribution {
        return RayleighDistribution.create(DEFAULT_RAYLEIGH_PARAMETERS.scale);
    }
    
    /**
     * Creates a RAYLEIGH distribution with the specified parameter
     */
    static create(scale: number): Distribution {
        return new Distribution(
            DistributionType.RAYLEIGH,
            { scale } as RayleighParameters
        );
    }
    
    /**
     * Validates RAYLEIGH distribution parameters
     */
    static validateParameters(params: RayleighParameters): boolean {
        return typeof params.scale === 'number' && params.scale > 0;
    }
    
    /**
     * Gets the effective value of a RAYLEIGH distribution (mean)
     */
    static getEffectiveValue(params: RayleighParameters): number {
        // Mean = scale * sqrt(π/2)
        return params.scale * Math.sqrt(Math.PI / 2);
    }
}
