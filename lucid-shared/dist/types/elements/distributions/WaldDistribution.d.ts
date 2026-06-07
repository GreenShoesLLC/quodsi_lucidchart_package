import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a WALD distribution type.
 */
export interface WaldParameters {
    mean: number;
    scale: number;
}
/**
 * Default parameters for WALD distribution.
 */
export declare const DEFAULT_WALD_PARAMETERS: WaldParameters;
/**
 * Metadata for WaldParameters fields.
 */
export declare const WALD_PARAMETER_METADATA: Record<keyof WaldParameters, ParameterMetadata>;
/**
 * Functions for working with Wald distributions
 */
export declare class WaldDistribution {
    /**
     * Creates a default WALD distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a WALD distribution with the specified parameters
     */
    static create(mean: number, scale: number): Distribution;
    /**
     * Validates WALD distribution parameters
     */
    static validateParameters(params: WaldParameters): boolean;
    /**
     * Gets the effective value of a WALD distribution (mean)
     */
    static getEffectiveValue(params: WaldParameters): number;
}
//# sourceMappingURL=WaldDistribution.d.ts.map