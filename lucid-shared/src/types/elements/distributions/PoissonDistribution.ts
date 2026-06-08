import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
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
export const DEFAULT_POISSON_PARAMETERS: PoissonParameters = {
    lam: 1
};

/**
 * Metadata for PoissonParameters fields.
 */
export const POISSON_PARAMETER_METADATA: Record<keyof PoissonParameters, ParameterMetadata> = {
    lam: {
        label: "Lambda",
        description: "The rate parameter (mean) of the Poisson distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Poisson distributions
 */
export class PoissonDistribution {
    /**
     * Creates a default POISSON distribution
     */
    static createDefault(): Distribution {
        return PoissonDistribution.create(DEFAULT_POISSON_PARAMETERS.lam);
    }
    
    /**
     * Creates a POISSON distribution with the specified lambda
     */
    static create(lam: number): Distribution {
        return new Distribution(
            DistributionType.POISSON,
            { lam } as PoissonParameters
        );
    }
    
    /**
     * Validates POISSON distribution parameters
     */
    static validateParameters(params: PoissonParameters): boolean {
        return typeof params.lam === 'number' && params.lam > 0;
    }
    
    /**
     * Gets the effective value of a POISSON distribution (mean)
     */
    static getEffectiveValue(params: PoissonParameters): number {
        return params.lam;
    }
}
