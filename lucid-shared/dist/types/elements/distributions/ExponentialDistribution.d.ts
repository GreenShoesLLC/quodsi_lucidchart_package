import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for an EXPONENTIAL distribution type.
 */
export interface ExponentialParameters {
    scale: number;
}
/**
 * Default parameters for EXPONENTIAL distribution.
 */
export declare const DEFAULT_EXPONENTIAL_PARAMETERS: ExponentialParameters;
/**
 * Metadata for ExponentialParameters fields.
 */
export declare const EXPONENTIAL_PARAMETER_METADATA: Record<keyof ExponentialParameters, ParameterMetadata>;
/**
 * Functions for working with Exponential distributions
 */
export declare class ExponentialDistribution {
    /**
     * Creates a default EXPONENTIAL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates an EXPONENTIAL distribution with the specified scale
     */
    static create(scale: number): Distribution;
    /**
     * Validates EXPONENTIAL distribution parameters
     */
    static validateParameters(params: ExponentialParameters): boolean;
    /**
     * Gets the effective value of an EXPONENTIAL distribution (mean)
     */
    static getEffectiveValue(params: ExponentialParameters): number;
}
//# sourceMappingURL=ExponentialDistribution.d.ts.map