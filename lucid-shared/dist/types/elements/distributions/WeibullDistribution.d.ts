import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a WEIBULL distribution type.
 */
export interface WeibullParameters {
    a: number;
}
/**
 * Default parameters for WEIBULL distribution.
 */
export declare const DEFAULT_WEIBULL_PARAMETERS: WeibullParameters;
/**
 * Metadata for WeibullParameters fields.
 */
export declare const WEIBULL_PARAMETER_METADATA: Record<keyof WeibullParameters, ParameterMetadata>;
/**
 * Functions for working with Weibull distributions
 */
export declare class WeibullDistribution {
    /**
     * Creates a default WEIBULL distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a WEIBULL distribution with the specified parameters
     */
    static create(a: number): Distribution;
    /**
     * Validates WEIBULL distribution parameters
     */
    static validateParameters(params: WeibullParameters): boolean;
    /**
     * Gets the effective value of a WEIBULL distribution
     * For this simple implementation, we just return the shape parameter
     */
    static getEffectiveValue(params: WeibullParameters): number;
}
//# sourceMappingURL=WeibullDistribution.d.ts.map