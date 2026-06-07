import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a GAMMA distribution type.
 */
export interface GammaParameters {
    shape: number;
    scale: number;
}

/**
 * Default parameters for GAMMA distribution.
 */
export const DEFAULT_GAMMA_PARAMETERS: GammaParameters = {
    shape: 2,
    scale: 2
};

/**
 * Metadata for GammaParameters fields.
 */
export const GAMMA_PARAMETER_METADATA: Record<keyof GammaParameters, ParameterMetadata> = {
    shape: {
        label: "Shape",
        description: "The shape parameter (k) of the gamma distribution",
        min: 0.01,
        step: 0.1
    },
    scale: {
        label: "Scale",
        description: "The scale parameter (θ) of the gamma distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Gamma distributions
 */
export class GammaDistribution {
    /**
     * Creates a default GAMMA distribution
     */
    static createDefault(): Distribution {
        return GammaDistribution.create(
            DEFAULT_GAMMA_PARAMETERS.shape,
            DEFAULT_GAMMA_PARAMETERS.scale
        );
    }
    
    /**
     * Creates a GAMMA distribution with the specified parameters
     */
    static create(shape: number, scale: number): Distribution {
        return new Distribution(
            DistributionType.GAMMA,
            { shape, scale } as GammaParameters
        );
    }
    
    /**
     * Validates GAMMA distribution parameters
     */
    static validateParameters(params: GammaParameters): boolean {
        return (
            typeof params.shape === 'number' &&
            typeof params.scale === 'number' &&
            params.shape > 0 &&
            params.scale > 0
        );
    }
    
    /**
     * Gets the effective value of a GAMMA distribution (mean)
     */
    static getEffectiveValue(params: GammaParameters): number {
        // Mean of Gamma(k, θ) is k * θ
        return params.shape * params.scale;
    }
}
