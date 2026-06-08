import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a F_DISTRIBUTION distribution type.
 */
export interface FDistributionParameters {
    dfnum: number;
    dfden: number;
}

/**
 * Default parameters for F_DISTRIBUTION distribution.
 */
export const DEFAULT_F_DISTRIBUTION_PARAMETERS: FDistributionParameters = {
    dfnum: 1,
    dfden: 1
};

/**
 * Metadata for FDistributionParameters fields.
 */
export const F_DISTRIBUTION_PARAMETER_METADATA: Record<keyof FDistributionParameters, ParameterMetadata> = {
    dfnum: {
        label: "Numerator df",
        description: "The degrees of freedom in the numerator",
        min: 1,
        step: 1
    },
    dfden: {
        label: "Denominator df",
        description: "The degrees of freedom in the denominator",
        min: 1,
        step: 1
    }
};

/**
 * Functions for working with F distributions
 */
export class FDistribution {
    /**
     * Creates a default F_DISTRIBUTION distribution
     */
    static createDefault(): Distribution {
        return FDistribution.create(
            DEFAULT_F_DISTRIBUTION_PARAMETERS.dfnum,
            DEFAULT_F_DISTRIBUTION_PARAMETERS.dfden
        );
    }
    
    /**
     * Creates a F_DISTRIBUTION distribution with the specified parameters
     */
    static create(dfnum: number, dfden: number): Distribution {
        return new Distribution(
            DistributionType.F_DISTRIBUTION,
            { dfnum, dfden } as FDistributionParameters
        );
    }
    
    /**
     * Validates F_DISTRIBUTION distribution parameters
     */
    static validateParameters(params: FDistributionParameters): boolean {
        return (
            typeof params.dfnum === 'number' &&
            typeof params.dfden === 'number' &&
            params.dfnum >= 1 &&
            params.dfden >= 1 &&
            params.dfnum === Math.floor(params.dfnum) &&
            params.dfden === Math.floor(params.dfden)
        );
    }
    
    /**
     * Gets the effective value of a F_DISTRIBUTION distribution (mean if defined)
     */
    static getEffectiveValue(params: FDistributionParameters): number {
        // Mean of F(d1, d2) = d2/(d2-2) for d2 > 2, otherwise undefined
        if (params.dfden > 2) {
            return params.dfden / (params.dfden - 2);
        }
        // Return a reasonable value if mean is undefined
        return 1;
    }
}
