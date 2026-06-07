import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a TRIANGULAR distribution type.
 * This represents a distribution with varying probability shaped like a triangle.
 */
export interface TriangularParameters {
    /**
     * The lower bound of the triangular distribution.
     */
    left: number;
    
    /**
     * The mode (peak) of the triangular distribution.
     */
    mode: number;
    
    /**
     * The upper bound of the triangular distribution.
     */
    right: number;
}

/**
 * Default parameters for TRIANGULAR distribution.
 */
export const DEFAULT_TRIANGULAR_PARAMETERS: TriangularParameters = {
    left: 0,
    mode: 5,
    right: 10
};

/**
 * Metadata for TriangularParameters fields.
 */
export const TRIANGULAR_PARAMETER_METADATA: Record<keyof TriangularParameters, ParameterMetadata> = {
    left: {
        label: "Minimum",
        description: "The minimum value of the triangular distribution",
        min: 0,
        step: 0.1
    },
    mode: {
        label: "Mode",
        description: "The most likely value (peak) of the triangular distribution",
        min: 0,
        step: 0.1
    },
    right: {
        label: "Maximum",
        description: "The maximum value of the triangular distribution",
        min: 0,
        step: 0.1
    }
};

/**
 * Functions for working with Triangular distributions
 */
export class TriangularDistribution {
    /**
     * Creates a default TRIANGULAR distribution
     */
    static createDefault(): Distribution {
        return TriangularDistribution.create(
            DEFAULT_TRIANGULAR_PARAMETERS.left,
            DEFAULT_TRIANGULAR_PARAMETERS.mode,
            DEFAULT_TRIANGULAR_PARAMETERS.right
        );
    }
    
    /**
     * Creates a TRIANGULAR distribution with the specified parameters
     */
    static create(left: number, mode: number, right: number): Distribution {
        return new Distribution(
            DistributionType.TRIANGULAR,
            { left, mode, right } as TriangularParameters
        );
    }
    
    /**
     * Validates TRIANGULAR distribution parameters
     */
    static validateParameters(params: TriangularParameters): boolean {
        return (
            typeof params.left === 'number' &&
            typeof params.mode === 'number' &&
            typeof params.right === 'number' &&
            params.left >= 0 &&
            params.mode >= params.left &&
            params.right >= params.mode
        );
    }
    
    /**
     * Gets the effective value of a TRIANGULAR distribution (mean)
     */
    static getEffectiveValue(params: TriangularParameters): number {
        return (params.left + params.mode + params.right) / 3;
    }
}
