import { Distribution } from "../Distribution";
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
export declare const DEFAULT_UNIFORM_PARAMETERS: UniformParameters;
/**
 * Metadata for UniformParameters fields.
 */
export declare const UNIFORM_PARAMETER_METADATA: Record<keyof UniformParameters, ParameterMetadata>;
/**
 * Functions for working with Uniform distributions
 */
export declare class UniformDistribution {
    /**
     * Creates a default UNIFORM distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a UNIFORM distribution with the specified parameters
     */
    static create(low: number, high: number): Distribution;
    /**
     * Validates UNIFORM distribution parameters
     */
    static validateParameters(params: UniformParameters): boolean;
    /**
     * Gets the effective value of a UNIFORM distribution (mean)
     */
    static getEffectiveValue(params: UniformParameters): number;
}
//# sourceMappingURL=UniformDistribution.d.ts.map