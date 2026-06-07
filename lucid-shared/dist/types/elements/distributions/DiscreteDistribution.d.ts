import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a DISCRETE distribution type.
 */
export interface DiscreteParameters {
    pvals: number[];
}
/**
 * Default parameters for DISCRETE distribution.
 */
export declare const DEFAULT_DISCRETE_PARAMETERS: DiscreteParameters;
/**
 * Metadata for DiscreteParameters fields.
 */
export declare const DISCRETE_PARAMETER_METADATA: Record<keyof DiscreteParameters, ParameterMetadata>;
/**
 * Functions for working with Discrete distributions
 */
export declare class DiscreteDistribution {
    /**
     * Creates a default DISCRETE distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a DISCRETE distribution with the specified parameters
     */
    static create(pvals: number[]): Distribution;
    /**
     * Validates DISCRETE distribution parameters
     */
    static validateParameters(params: DiscreteParameters): boolean;
    /**
     * Gets the effective value of a DISCRETE distribution
     * Returns the expected value (sum of index * probability)
     */
    static getEffectiveValue(params: DiscreteParameters): number;
}
//# sourceMappingURL=DiscreteDistribution.d.ts.map