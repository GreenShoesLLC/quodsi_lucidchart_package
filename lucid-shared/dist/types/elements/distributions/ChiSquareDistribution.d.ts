import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a CHI_SQUARE distribution type.
 */
export interface ChiSquareParameters {
    df: number;
}
/**
 * Default parameters for CHI_SQUARE distribution.
 */
export declare const DEFAULT_CHI_SQUARE_PARAMETERS: ChiSquareParameters;
/**
 * Metadata for ChiSquareParameters fields.
 */
export declare const CHI_SQUARE_PARAMETER_METADATA: Record<keyof ChiSquareParameters, ParameterMetadata>;
/**
 * Functions for working with Chi-Square distributions
 */
export declare class ChiSquareDistribution {
    /**
     * Creates a default CHI_SQUARE distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a CHI_SQUARE distribution with the specified df
     */
    static create(df: number): Distribution;
    /**
     * Validates CHI_SQUARE distribution parameters
     */
    static validateParameters(params: ChiSquareParameters): boolean;
    /**
     * Gets the effective value of a CHI_SQUARE distribution (mean)
     */
    static getEffectiveValue(params: ChiSquareParameters): number;
}
//# sourceMappingURL=ChiSquareDistribution.d.ts.map