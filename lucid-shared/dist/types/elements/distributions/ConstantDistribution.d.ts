import { Distribution } from "../Distribution";
/**
 * Parameters for a CONSTANT distribution type.
 * This represents a constant value that does not vary.
 */
export interface ConstantParameters {
    /**
     * The constant value to use.
     */
    value: number;
}
/**
 * Default parameters for CONSTANT distribution.
 */
export declare const DEFAULT_CONSTANT_PARAMETERS: ConstantParameters;
/**
 * Metadata for parameter fields.
 */
export interface ParameterMetadata {
    label: string;
    description: string;
    min?: number;
    max?: number;
    step?: number;
}
/**
 * Metadata for ConstantParameters fields.
 */
export declare const CONSTANT_PARAMETER_METADATA: Record<keyof ConstantParameters, ParameterMetadata>;
/**
 * Functions for working with Constant distributions
 */
export declare class ConstantDistribution {
    /**
     * Creates a default CONSTANT distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a CONSTANT distribution with the specified value
     */
    static create(value: number): Distribution;
    /**
     * Validates CONSTANT distribution parameters
     */
    static validateParameters(params: ConstantParameters): boolean;
    /**
     * Gets the effective value of a CONSTANT distribution
     */
    static getEffectiveValue(params: ConstantParameters): number;
}
//# sourceMappingURL=ConstantDistribution.d.ts.map