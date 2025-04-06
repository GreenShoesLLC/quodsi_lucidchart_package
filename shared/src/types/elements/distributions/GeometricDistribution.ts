import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a GEOMETRIC distribution type.
 */
export interface GeometricParameters {
    p: number;
}

/**
 * Default parameters for GEOMETRIC distribution.
 */
export const DEFAULT_GEOMETRIC_PARAMETERS: GeometricParameters = {
    p: 0.5
};

/**
 * Metadata for GeometricParameters fields.
 */
export const GEOMETRIC_PARAMETER_METADATA: Record<keyof GeometricParameters, ParameterMetadata> = {
    p: {
        label: "P",
        description: "The probability of success in a single trial",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Geometric distributions
 */
export class GeometricDistribution {
    /**
     * Creates a default GEOMETRIC distribution
     */
    static createDefault(): Distribution {
        return GeometricDistribution.create(DEFAULT_GEOMETRIC_PARAMETERS.p);
    }
    
    /**
     * Creates a GEOMETRIC distribution with the specified probability
     */
    static create(p: number): Distribution {
        return new Distribution(
            DistributionType.GEOMETRIC,
            { p } as GeometricParameters
        );
    }
    
    /**
     * Validates GEOMETRIC distribution parameters
     */
    static validateParameters(params: GeometricParameters): boolean {
        return typeof params.p === 'number' && params.p > 0 && params.p <= 1;
    }
    
    /**
     * Gets the effective value of a GEOMETRIC distribution (mean)
     */
    static getEffectiveValue(params: GeometricParameters): number {
        return 1 / params.p;
    }
}
