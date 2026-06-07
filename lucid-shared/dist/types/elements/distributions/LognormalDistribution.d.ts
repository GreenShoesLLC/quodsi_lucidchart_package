import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a LOGNORMAL distribution type.
 */
export interface LognormalParameters {
    mean: number;
    sigma: number;
}
/**
 * Default parameters for LOGNORMAL distribution.
 */
export declare const DEFAULT_LOGNORMAL_PARAMETERS: LognormalParameters;
/**
 * Metadata for LognormalParameters fields.
 */
export declare const LOGNORMAL_PARAMETER_METADATA: Record<keyof LognormalParameters, ParameterMetadata>;
/**
 * Functions for working with Lognormal distributions
 */
export declare class LognormalDistribution {
    /**
     * Creates a default LOGNORMAL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a LOGNORMAL distribution with the specified parameters
     */
    static create(mean: number, sigma: number): Distribution;
    /**
     * Validates LOGNORMAL distribution parameters
     */
    static validateParameters(params: LognormalParameters): boolean;
    /**
     * Gets the effective value of a LOGNORMAL distribution (median)
     */
    static getEffectiveValue(params: LognormalParameters): number;
}
//# sourceMappingURL=LognormalDistribution.d.ts.map