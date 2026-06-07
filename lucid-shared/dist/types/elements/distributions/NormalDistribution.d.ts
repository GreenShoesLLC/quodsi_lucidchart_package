import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a NORMAL distribution type.
 * This represents a normal (Gaussian) distribution.
 */
export interface NormalParameters {
    /**
     * The mean (average) of the normal distribution.
     */
    mean: number;
    /**
     * The standard deviation of the normal distribution.
     */
    std: number;
}
/**
 * Default parameters for NORMAL distribution.
 */
export declare const DEFAULT_NORMAL_PARAMETERS: NormalParameters;
/**
 * Metadata for NormalParameters fields.
 */
export declare const NORMAL_PARAMETER_METADATA: Record<keyof NormalParameters, ParameterMetadata>;
/**
 * Functions for working with Normal distributions
 */
export declare class NormalDistribution {
    /**
     * Creates a default NORMAL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a NORMAL distribution with the specified parameters
     */
    static create(mean: number, std: number): Distribution;
    /**
     * Validates NORMAL distribution parameters
     */
    static validateParameters(params: NormalParameters): boolean;
    /**
     * Gets the effective value of a NORMAL distribution (mean)
     */
    static getEffectiveValue(params: NormalParameters): number;
}
//# sourceMappingURL=NormalDistribution.d.ts.map