import { Distribution } from "../Distribution";
import { ParameterMetadata } from "./ConstantDistribution";
/**
 * Parameters for a VON_MISES distribution type.
 */
export interface VonMisesParameters {
    mu: number;
    kappa: number;
}
/**
 * Default parameters for VON_MISES distribution.
 */
export declare const DEFAULT_VON_MISES_PARAMETERS: VonMisesParameters;
/**
 * Metadata for VonMisesParameters fields.
 */
export declare const VON_MISES_PARAMETER_METADATA: Record<keyof VonMisesParameters, ParameterMetadata>;
/**
 * Functions for working with Von Mises distributions
 */
export declare class VonMisesDistribution {
    /**
     * Creates a default VON_MISES distribution
     */
    static createDefault(): Distribution;
    /**
     * Creates a VON_MISES distribution with the specified parameters
     */
    static create(mu: number, kappa: number): Distribution;
    /**
     * Validates VON_MISES distribution parameters
     */
    static validateParameters(params: VonMisesParameters): boolean;
    /**
     * Gets the effective value of a VON_MISES distribution (mean)
     */
    static getEffectiveValue(params: VonMisesParameters): number;
}
//# sourceMappingURL=VonMisesDistribution.d.ts.map