import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a LOGISTIC distribution type.
 */
export interface LogisticParameters {
    loc: number;
    scale: number;
}
/**
 * Default parameters for LOGISTIC distribution.
 */
export declare const DEFAULT_LOGISTIC_PARAMETERS: LogisticParameters;
/**
 * Metadata for LogisticParameters fields.
 */
export declare const LOGISTIC_PARAMETER_METADATA: Record<keyof LogisticParameters, ParameterMetadata>;
/**
 * Functions for working with Logistic distributions
 */
export declare class LogisticDistribution {
    /**
     * Creates a default LOGISTIC distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a LOGISTIC distribution with the specified parameters
     */
    static create(loc: number, scale: number): Distribution;
    /**
     * Validates LOGISTIC distribution parameters
     */
    static validateParameters(params: LogisticParameters): boolean;
    /**
     * Gets the effective value of a LOGISTIC distribution (mean)
     */
    static getEffectiveValue(params: LogisticParameters): number;
}
//# sourceMappingURL=LogisticDistribution.d.ts.map