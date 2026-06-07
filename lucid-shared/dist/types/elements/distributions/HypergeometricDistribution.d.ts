import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a HYPERGEOMETRIC distribution type.
 */
export interface HypergeometricParameters {
    ngood: number;
    nbad: number;
    nsample: number;
}
/**
 * Default parameters for HYPERGEOMETRIC distribution.
 */
export declare const DEFAULT_HYPERGEOMETRIC_PARAMETERS: HypergeometricParameters;
/**
 * Metadata for HypergeometricParameters fields.
 */
export declare const HYPERGEOMETRIC_PARAMETER_METADATA: Record<keyof HypergeometricParameters, ParameterMetadata>;
/**
 * Functions for working with Hypergeometric distributions
 */
export declare class HypergeometricDistribution {
    /**
     * Creates a default HYPERGEOMETRIC distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a HYPERGEOMETRIC distribution with the specified parameters
     */
    static create(ngood: number, nbad: number, nsample: number): Distribution;
    /**
     * Validates HYPERGEOMETRIC distribution parameters
     */
    static validateParameters(params: HypergeometricParameters): boolean;
    /**
     * Gets the effective value of a HYPERGEOMETRIC distribution (mean)
     */
    static getEffectiveValue(params: HypergeometricParameters): number;
}
//# sourceMappingURL=HypergeometricDistribution.d.ts.map