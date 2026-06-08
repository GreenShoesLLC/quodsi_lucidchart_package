import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
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
export const DEFAULT_VON_MISES_PARAMETERS: VonMisesParameters = {
    mu: 0,
    kappa: 1
};

/**
 * Metadata for VonMisesParameters fields.
 */
export const VON_MISES_PARAMETER_METADATA: Record<keyof VonMisesParameters, ParameterMetadata> = {
    mu: {
        label: "Mu",
        description: "The location parameter (mean angle)",
        step: 0.1
    },
    kappa: {
        label: "Kappa",
        description: "The concentration parameter",
        min: 0,
        step: 0.1
    }
};

/**
 * Functions for working with Von Mises distributions
 */
export class VonMisesDistribution {
    /**
     * Creates a default VON_MISES distribution
     */
    static createDefault(): Distribution {
        return VonMisesDistribution.create(
            DEFAULT_VON_MISES_PARAMETERS.mu,
            DEFAULT_VON_MISES_PARAMETERS.kappa
        );
    }
    
    /**
     * Creates a VON_MISES distribution with the specified parameters
     */
    static create(mu: number, kappa: number): Distribution {
        return new Distribution(
            DistributionType.VON_MISES,
            { mu, kappa } as VonMisesParameters
        );
    }
    
    /**
     * Validates VON_MISES distribution parameters
     */
    static validateParameters(params: VonMisesParameters): boolean {
        return (
            typeof params.mu === 'number' &&
            typeof params.kappa === 'number' &&
            params.kappa >= 0
        );
    }
    
    /**
     * Gets the effective value of a VON_MISES distribution (mean)
     */
    static getEffectiveValue(params: VonMisesParameters): number {
        return params.mu;
    }
}
