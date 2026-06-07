import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a GAMMA distribution type.
 */
export interface GammaParameters {
    shape: number;
    scale: number;
}
/**
 * Default parameters for GAMMA distribution.
 */
export declare const DEFAULT_GAMMA_PARAMETERS: GammaParameters;
/**
 * Metadata for GammaParameters fields.
 */
export declare const GAMMA_PARAMETER_METADATA: Record<keyof GammaParameters, ParameterMetadata>;
/**
 * Functions for working with Gamma distributions
 */
export declare class GammaDistribution {
    /**
     * Creates a default GAMMA distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a GAMMA distribution with the specified parameters
     */
    static create(shape: number, scale: number): Distribution;
    /**
     * Validates GAMMA distribution parameters
     */
    static validateParameters(params: GammaParameters): boolean;
    /**
     * Gets the effective value of a GAMMA distribution (mean)
     */
    static getEffectiveValue(params: GammaParameters): number;
}
//# sourceMappingURL=GammaDistribution.d.ts.map