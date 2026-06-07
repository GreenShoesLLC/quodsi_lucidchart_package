import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a LAPLACE distribution type.
 */
export interface LaplaceParameters {
    loc: number;
    scale: number;
}
/**
 * Default parameters for LAPLACE distribution.
 */
export declare const DEFAULT_LAPLACE_PARAMETERS: LaplaceParameters;
/**
 * Metadata for LaplaceParameters fields.
 */
export declare const LAPLACE_PARAMETER_METADATA: Record<keyof LaplaceParameters, ParameterMetadata>;
/**
 * Functions for working with Laplace distributions
 */
export declare class LaplaceDistribution {
    /**
     * Creates a default LAPLACE distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a LAPLACE distribution with the specified parameters
     */
    static create(loc: number, scale: number): Distribution;
    /**
     * Validates LAPLACE distribution parameters
     */
    static validateParameters(params: LaplaceParameters): boolean;
    /**
     * Gets the effective value of a LAPLACE distribution (mean)
     */
    static getEffectiveValue(params: LaplaceParameters): number;
}
//# sourceMappingURL=LaplaceDistribution.d.ts.map