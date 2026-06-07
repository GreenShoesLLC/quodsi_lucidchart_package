import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a BETA distribution type.
 */
export interface BetaParameters {
    alpha: number;
    beta: number;
}
/**
 * Default parameters for BETA distribution.
 */
export declare const DEFAULT_BETA_PARAMETERS: BetaParameters;
/**
 * Metadata for BetaParameters fields.
 */
export declare const BETA_PARAMETER_METADATA: Record<keyof BetaParameters, ParameterMetadata>;
/**
 * Functions for working with Beta distributions
 */
export declare class BetaDistribution {
    /**
     * Creates a default BETA distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a BETA distribution with the specified parameters
     */
    static create(alpha: number, beta: number): Distribution;
    /**
     * Validates BETA distribution parameters
     */
    static validateParameters(params: BetaParameters): boolean;
    /**
     * Gets the effective value of a BETA distribution (mean)
     */
    static getEffectiveValue(params: BetaParameters): number;
}
//# sourceMappingURL=BetaDistribution.d.ts.map