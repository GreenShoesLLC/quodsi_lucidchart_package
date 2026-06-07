import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a F_DISTRIBUTION distribution type.
 */
export interface FDistributionParameters {
    dfnum: number;
    dfden: number;
}
/**
 * Default parameters for F_DISTRIBUTION distribution.
 */
export declare const DEFAULT_F_DISTRIBUTION_PARAMETERS: FDistributionParameters;
/**
 * Metadata for FDistributionParameters fields.
 */
export declare const F_DISTRIBUTION_PARAMETER_METADATA: Record<keyof FDistributionParameters, ParameterMetadata>;
/**
 * Functions for working with F distributions
 */
export declare class FDistribution {
    /**
     * Creates a default F_DISTRIBUTION distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a F_DISTRIBUTION distribution with the specified parameters
     */
    static create(dfnum: number, dfden: number): Distribution;
    /**
     * Validates F_DISTRIBUTION distribution parameters
     */
    static validateParameters(params: FDistributionParameters): boolean;
    /**
     * Gets the effective value of a F_DISTRIBUTION distribution (mean if defined)
     */
    static getEffectiveValue(params: FDistributionParameters): number;
}
//# sourceMappingURL=FDistribution.d.ts.map