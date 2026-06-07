import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a LOG_SERIES distribution type.
 */
export interface LogSeriesParameters {
    p: number;
}
/**
 * Default parameters for LOG_SERIES distribution.
 */
export declare const DEFAULT_LOG_SERIES_PARAMETERS: LogSeriesParameters;
/**
 * Metadata for LogSeriesParameters fields.
 */
export declare const LOG_SERIES_PARAMETER_METADATA: Record<keyof LogSeriesParameters, ParameterMetadata>;
/**
 * Functions for working with Log Series distributions
 */
export declare class LogSeriesDistribution {
    /**
     * Creates a default LOG_SERIES distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a LOG_SERIES distribution with the specified parameter
     */
    static create(p: number): Distribution;
    /**
     * Validates LOG_SERIES distribution parameters
     */
    static validateParameters(params: LogSeriesParameters): boolean;
    /**
     * Gets the effective value of a LOG_SERIES distribution (mean)
     */
    static getEffectiveValue(params: LogSeriesParameters): number;
}
//# sourceMappingURL=LogSeriesDistribution.d.ts.map