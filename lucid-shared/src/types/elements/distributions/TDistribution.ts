import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a T_DISTRIBUTION distribution type.
 */
export interface TDistributionParameters {
    df: number;
}

/**
 * Default parameters for T_DISTRIBUTION distribution.
 */
export const DEFAULT_T_DISTRIBUTION_PARAMETERS: TDistributionParameters = {
    df: 1
};

/**
 * Metadata for TDistributionParameters fields.
 */
export const T_DISTRIBUTION_PARAMETER_METADATA: Record<keyof TDistributionParameters, ParameterMetadata> = {
    df: {
        label: "Degrees of Freedom",
        description: "The degrees of freedom parameter",
        min: 1,
        step: 1
    }
};

/**
 * Functions for working with T distributions
 */
export class TDistribution {
    /**
     * Creates a default T_DISTRIBUTION distribution
     */
    static createDefault(): Distribution {
        return TDistribution.create(DEFAULT_T_DISTRIBUTION_PARAMETERS.df);
    }
    
    /**
     * Creates a T_DISTRIBUTION distribution with the specified parameter
     */
    static create(df: number): Distribution {
        return new Distribution(
            DistributionType.T_DISTRIBUTION,
            { df } as TDistributionParameters
        );
    }
    
    /**
     * Validates T_DISTRIBUTION distribution parameters
     */
    static validateParameters(params: TDistributionParameters): boolean {
        return (
            typeof params.df === 'number' &&
            params.df >= 1 &&
            params.df === Math.floor(params.df)
        );
    }
    
    /**
     * Gets the effective value of a T_DISTRIBUTION distribution (mean if defined)
     */
    static getEffectiveValue(params: TDistributionParameters): number {
        // Mean = 0 for df > 1, otherwise undefined
        return 0;
    }
}
