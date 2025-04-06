import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a LAPLACE distribution type.
 */
export interface LaplaceParameters {
    loc: number;
    scale: number;
}

/**
 * Default parameters for LAPLACE distribution.
 */
export const DEFAULT_LAPLACE_PARAMETERS: LaplaceParameters = {
    loc: 0,
    scale: 1
};

/**
 * Metadata for LaplaceParameters fields.
 */
export const LAPLACE_PARAMETER_METADATA: Record<keyof LaplaceParameters, ParameterMetadata> = {
    loc: {
        label: "Location",
        description: "The location parameter (mean)",
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
 * Functions for working with Laplace distributions
 */
export class LaplaceDistribution {
    /**
     * Creates a default LAPLACE distribution
     */
    static createDefault(): Distribution {
        return LaplaceDistribution.create(
            DEFAULT_LAPLACE_PARAMETERS.loc,
            DEFAULT_LAPLACE_PARAMETERS.scale
        );
    }
    
    /**
     * Creates a LAPLACE distribution with the specified parameters
     */
    static create(loc: number, scale: number): Distribution {
        return new Distribution(
            DistributionType.LAPLACE,
            { loc, scale } as LaplaceParameters
        );
    }
    
    /**
     * Validates LAPLACE distribution parameters
     */
    static validateParameters(params: LaplaceParameters): boolean {
        return (
            typeof params.loc === 'number' &&
            typeof params.scale === 'number' &&
            params.scale > 0
        );
    }
    
    /**
     * Gets the effective value of a LAPLACE distribution (mean)
     */
    static getEffectiveValue(params: LaplaceParameters): number {
        return params.loc;
    }
}
