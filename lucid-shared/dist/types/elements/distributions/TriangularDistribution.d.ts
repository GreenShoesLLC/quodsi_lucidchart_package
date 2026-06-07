import { Distribution } from "../Distribution";
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
export declare const DEFAULT_TRIANGULAR_PARAMETERS: TriangularParameters;
/**
 * Metadata for TriangularParameters fields.
 */
export declare const TRIANGULAR_PARAMETER_METADATA: Record<keyof TriangularParameters, ParameterMetadata>;
/**
 * Functions for working with Triangular distributions
 */
export declare class TriangularDistribution {
    /**
     * Creates a default TRIANGULAR distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a TRIANGULAR distribution with the specified parameters
     */
    static create(left: number, mode: number, right: number): Distribution;
    /**
     * Validates TRIANGULAR distribution parameters
     */
    static validateParameters(params: TriangularParameters): boolean;
    /**
     * Gets the effective value of a TRIANGULAR distribution (mean)
     */
    static getEffectiveValue(params: TriangularParameters): number;
}
//# sourceMappingURL=TriangularDistribution.d.ts.map