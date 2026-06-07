import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a T_DISTRIBUTION distribution type.
 */
export interface TDistributionParameters {
    df: number;
}
/**
 * Default parameters for T_DISTRIBUTION distribution.
 */
export declare const DEFAULT_T_DISTRIBUTION_PARAMETERS: TDistributionParameters;
/**
 * Metadata for TDistributionParameters fields.
 */
export declare const T_DISTRIBUTION_PARAMETER_METADATA: Record<keyof TDistributionParameters, ParameterMetadata>;
/**
 * Functions for working with T distributions
 */
export declare class TDistribution {
    /**
     * Creates a default T_DISTRIBUTION distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a T_DISTRIBUTION distribution with the specified parameter
     */
    static create(df: number): Distribution;
    /**
     * Validates T_DISTRIBUTION distribution parameters
     */
    static validateParameters(params: TDistributionParameters): boolean;
    /**
     * Gets the effective value of a T_DISTRIBUTION distribution (mean if defined)
     */
    static getEffectiveValue(params: TDistributionParameters): number;
}
//# sourceMappingURL=TDistribution.d.ts.map