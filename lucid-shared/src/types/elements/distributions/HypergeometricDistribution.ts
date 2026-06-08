import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a HYPERGEOMETRIC distribution type.
 */
export interface HypergeometricParameters {
    ngood: number;
    nbad: number;
    nsample: number;
}

/**
 * Default parameters for HYPERGEOMETRIC distribution.
 */
export const DEFAULT_HYPERGEOMETRIC_PARAMETERS: HypergeometricParameters = {
    ngood: 10,
    nbad: 10,
    nsample: 10
};

/**
 * Metadata for HypergeometricParameters fields.
 */
export const HYPERGEOMETRIC_PARAMETER_METADATA: Record<keyof HypergeometricParameters, ParameterMetadata> = {
    ngood: {
        label: "Good Items",
        description: "The number of good items in the population",
        min: 0,
        step: 1
    },
    nbad: {
        label: "Bad Items",
        description: "The number of bad items in the population",
        min: 0,
        step: 1
    },
    nsample: {
        label: "Sample Size",
        description: "The number of items drawn from the population",
        min: 1,
        step: 1
    }
};

/**
 * Functions for working with Hypergeometric distributions
 */
export class HypergeometricDistribution {
    /**
     * Creates a default HYPERGEOMETRIC distribution
     */
    static createDefault(): Distribution {
        return HypergeometricDistribution.create(
            DEFAULT_HYPERGEOMETRIC_PARAMETERS.ngood,
            DEFAULT_HYPERGEOMETRIC_PARAMETERS.nbad,
            DEFAULT_HYPERGEOMETRIC_PARAMETERS.nsample
        );
    }
    
    /**
     * Creates a HYPERGEOMETRIC distribution with the specified parameters
     */
    static create(ngood: number, nbad: number, nsample: number): Distribution {
        return new Distribution(
            DistributionType.HYPERGEOMETRIC,
            { ngood, nbad, nsample } as HypergeometricParameters
        );
    }
    
    /**
     * Validates HYPERGEOMETRIC distribution parameters
     */
    static validateParameters(params: HypergeometricParameters): boolean {
        return (
            typeof params.ngood === 'number' &&
            typeof params.nbad === 'number' &&
            typeof params.nsample === 'number' &&
            params.ngood >= 0 &&
            params.nbad >= 0 &&
            params.nsample >= 1 &&
            params.ngood === Math.floor(params.ngood) &&
            params.nbad === Math.floor(params.nbad) &&
            params.nsample === Math.floor(params.nsample) &&
            params.nsample <= (params.ngood + params.nbad)
        );
    }
    
    /**
     * Gets the effective value of a HYPERGEOMETRIC distribution (mean)
     */
    static getEffectiveValue(params: HypergeometricParameters): number {
        const totalPopulation = params.ngood + params.nbad;
        if (totalPopulation === 0) {
            return 0;
        }
        return params.nsample * (params.ngood / totalPopulation);
    }
}
