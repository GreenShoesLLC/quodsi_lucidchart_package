import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a NEGATIVE_BINOMIAL distribution type.
 */
export interface NegativeBinomialParameters {
    n: number;
    p: number;
}
/**
 * Default parameters for NEGATIVE_BINOMIAL distribution.
 */
export declare const DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS: NegativeBinomialParameters;
/**
 * Metadata for NegativeBinomialParameters fields.
 */
export declare const NEGATIVE_BINOMIAL_PARAMETER_METADATA: Record<keyof NegativeBinomialParameters, ParameterMetadata>;
/**
 * Functions for working with Negative Binomial distributions
 */
export declare class NegativeBinomialDistribution {
    /**
     * Creates a default NEGATIVE_BINOMIAL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a NEGATIVE_BINOMIAL distribution with the specified parameters
     */
    static create(n: number, p: number): Distribution;
    /**
     * Validates NEGATIVE_BINOMIAL distribution parameters
     */
    static validateParameters(params: NegativeBinomialParameters): boolean;
    /**
     * Gets the effective value of a NEGATIVE_BINOMIAL distribution (mean)
     */
    static getEffectiveValue(params: NegativeBinomialParameters): number;
}
//# sourceMappingURL=NegativeBinomialDistribution.d.ts.map