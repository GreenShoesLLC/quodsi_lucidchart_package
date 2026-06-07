import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a ZIPF distribution type.
 */
export interface ZipfParameters {
    a: number;
}
/**
 * Default parameters for ZIPF distribution.
 */
export declare const DEFAULT_ZIPF_PARAMETERS: ZipfParameters;
/**
 * Metadata for ZipfParameters fields.
 */
export declare const ZIPF_PARAMETER_METADATA: Record<keyof ZipfParameters, ParameterMetadata>;
/**
 * Functions for working with Zipf distributions
 */
export declare class ZipfDistribution {
    /**
     * Creates a default ZIPF distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a ZIPF distribution with the specified parameter
     */
    static create(a: number): Distribution;
    /**
     * Validates ZIPF distribution parameters
     */
    static validateParameters(params: ZipfParameters): boolean;
    /**
     * Gets the effective value of a ZIPF distribution
     * For simplicity, return the parameter value
     */
    static getEffectiveValue(params: ZipfParameters): number;
}
//# sourceMappingURL=ZipfDistribution.d.ts.map