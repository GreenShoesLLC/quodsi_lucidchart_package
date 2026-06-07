import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a BINOMIAL distribution type.
 */
export interface BinomialParameters {
    n: number;
    p: number;
}
/**
 * Default parameters for BINOMIAL distribution.
 */
export declare const DEFAULT_BINOMIAL_PARAMETERS: BinomialParameters;
/**
 * Metadata for BinomialParameters fields.
 */
export declare const BINOMIAL_PARAMETER_METADATA: Record<keyof BinomialParameters, ParameterMetadata>;
/**
 * Functions for working with Binomial distributions
 */
export declare class BinomialDistribution {
    /**
     * Creates a default BINOMIAL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a BINOMIAL distribution with the specified parameters
     */
    static create(n: number, p: number): Distribution;
    /**
     * Validates BINOMIAL distribution parameters
     */
    static validateParameters(params: BinomialParameters): boolean;
    /**
     * Gets the effective value of a BINOMIAL distribution (mean)
     */
    static getEffectiveValue(params: BinomialParameters): number;
}
//# sourceMappingURL=BinomialDistribution.d.ts.map