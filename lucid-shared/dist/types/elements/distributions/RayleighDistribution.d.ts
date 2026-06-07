import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a RAYLEIGH distribution type.
 */
export interface RayleighParameters {
    scale: number;
}
/**
 * Default parameters for RAYLEIGH distribution.
 */
export declare const DEFAULT_RAYLEIGH_PARAMETERS: RayleighParameters;
/**
 * Metadata for RayleighParameters fields.
 */
export declare const RAYLEIGH_PARAMETER_METADATA: Record<keyof RayleighParameters, ParameterMetadata>;
/**
 * Functions for working with Rayleigh distributions
 */
export declare class RayleighDistribution {
    /**
     * Creates a default RAYLEIGH distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a RAYLEIGH distribution with the specified parameter
     */
    static create(scale: number): Distribution;
    /**
     * Validates RAYLEIGH distribution parameters
     */
    static validateParameters(params: RayleighParameters): boolean;
    /**
     * Gets the effective value of a RAYLEIGH distribution (mean)
     */
    static getEffectiveValue(params: RayleighParameters): number;
}
//# sourceMappingURL=RayleighDistribution.d.ts.map