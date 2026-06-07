import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a MULTINOMIAL distribution type.
 */
export interface MultinomialParameters {
    n: number;
    pvals: number[];
}
/**
 * Default parameters for MULTINOMIAL distribution.
 */
export declare const DEFAULT_MULTINOMIAL_PARAMETERS: MultinomialParameters;
/**
 * Metadata for MultinomialParameters fields.
 */
export declare const MULTINOMIAL_PARAMETER_METADATA: Record<keyof MultinomialParameters, ParameterMetadata>;
/**
 * Functions for working with Multinomial distributions
 */
export declare class MultinomialDistribution {
    /**
     * Creates a default MULTINOMIAL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a MULTINOMIAL distribution with the specified parameters
     */
    static create(n: number, pvals: number[]): Distribution;
    /**
     * Validates MULTINOMIAL distribution parameters
     */
    static validateParameters(params: MultinomialParameters): boolean;
    /**
     * Gets the effective value of a MULTINOMIAL distribution
     */
    static getEffectiveValue(params: MultinomialParameters): number;
}
//# sourceMappingURL=MultinomialDistribution.d.ts.map