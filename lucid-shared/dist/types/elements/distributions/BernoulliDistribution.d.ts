import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a BERNOULLI distribution type.
 */
export interface BernoulliParameters {
    p: number;
}
/**
 * Default parameters for BERNOULLI distribution.
 */
export declare const DEFAULT_BERNOULLI_PARAMETERS: BernoulliParameters;
/**
 * Metadata for BernoulliParameters fields.
 */
export declare const BERNOULLI_PARAMETER_METADATA: Record<keyof BernoulliParameters, ParameterMetadata>;
/**
 * Functions for working with Bernoulli distributions
 */
export declare class BernoulliDistribution {
    /**
     * Creates a default BERNOULLI distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a BERNOULLI distribution with the specified probability
     */
    static create(p: number): Distribution;
    /**
     * Validates BERNOULLI distribution parameters
     */
    static validateParameters(params: BernoulliParameters): boolean;
    /**
     * Gets the effective value of a BERNOULLI distribution (mean)
     */
    static getEffectiveValue(params: BernoulliParameters): number;
}
//# sourceMappingURL=BernoulliDistribution.d.ts.map