import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a PARETO distribution type.
 */
export interface ParetoParameters {
    a: number;
}
/**
 * Default parameters for PARETO distribution.
 */
export declare const DEFAULT_PARETO_PARAMETERS: ParetoParameters;
/**
 * Metadata for ParetoParameters fields.
 */
export declare const PARETO_PARAMETER_METADATA: Record<keyof ParetoParameters, ParameterMetadata>;
/**
 * Functions for working with Pareto distributions
 */
export declare class ParetoDistribution {
    /**
     * Creates a default PARETO distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a PARETO distribution with the specified parameter
     */
    static create(a: number): Distribution;
    /**
     * Validates PARETO distribution parameters
     */
    static validateParameters(params: ParetoParameters): boolean;
    /**
     * Gets the effective value of a PARETO distribution (mean if defined)
     */
    static getEffectiveValue(params: ParetoParameters): number;
}
//# sourceMappingURL=ParetoDistribution.d.ts.map