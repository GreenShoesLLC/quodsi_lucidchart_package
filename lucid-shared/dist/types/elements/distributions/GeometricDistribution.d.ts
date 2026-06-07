import { Distribution } from "../Distribution";
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
export declare const DEFAULT_GEOMETRIC_PARAMETERS: GeometricParameters;
/**
 * Metadata for GeometricParameters fields.
 */
export declare const GEOMETRIC_PARAMETER_METADATA: Record<keyof GeometricParameters, ParameterMetadata>;
/**
 * Functions for working with Geometric distributions
 */
export declare class GeometricDistribution {
    /**
     * Creates a default GEOMETRIC distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a GEOMETRIC distribution with the specified probability
     */
    static create(p: number): Distribution;
    /**
     * Validates GEOMETRIC distribution parameters
     */
    static validateParameters(params: GeometricParameters): boolean;
    /**
     * Gets the effective value of a GEOMETRIC distribution (mean)
     */
    static getEffectiveValue(params: GeometricParameters): number;
}
//# sourceMappingURL=GeometricDistribution.d.ts.map