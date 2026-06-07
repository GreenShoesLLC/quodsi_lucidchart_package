import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a POISSON distribution type.
 */
export interface PoissonParameters {
    lam: number;
}
/**
 * Default parameters for POISSON distribution.
 */
export declare const DEFAULT_POISSON_PARAMETERS: PoissonParameters;
/**
 * Metadata for PoissonParameters fields.
 */
export declare const POISSON_PARAMETER_METADATA: Record<keyof PoissonParameters, ParameterMetadata>;
/**
 * Functions for working with Poisson distributions
 */
export declare class PoissonDistribution {
    /**
     * Creates a default POISSON distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a POISSON distribution with the specified lambda
     */
    static create(lam: number): Distribution;
    /**
     * Validates POISSON distribution parameters
     */
    static validateParameters(params: PoissonParameters): boolean;
    /**
     * Gets the effective value of a POISSON distribution (mean)
     */
    static getEffectiveValue(params: PoissonParameters): number;
}
//# sourceMappingURL=PoissonDistribution.d.ts.map