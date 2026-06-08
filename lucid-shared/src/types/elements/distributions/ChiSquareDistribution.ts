import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a CHI_SQUARE distribution type.
 */
export interface ChiSquareParameters {
    df: number;
}

/**
 * Default parameters for CHI_SQUARE distribution.
 */
export const DEFAULT_CHI_SQUARE_PARAMETERS: ChiSquareParameters = {
    df: 1
};

/**
 * Metadata for ChiSquareParameters fields.
 */
export const CHI_SQUARE_PARAMETER_METADATA: Record<keyof ChiSquareParameters, ParameterMetadata> = {
    df: {
        label: "Degrees of Freedom",
        description: "The degrees of freedom parameter",
        min: 1,
        step: 1
    }
};

/**
 * Functions for working with Chi-Square distributions
 */
export class ChiSquareDistribution {
    /**
     * Creates a default CHI_SQUARE distribution
     */
    static createDefault(): Distribution {
        return ChiSquareDistribution.create(DEFAULT_CHI_SQUARE_PARAMETERS.df);
    }
    
    /**
     * Creates a CHI_SQUARE distribution with the specified df
     */
    static create(df: number): Distribution {
        return new Distribution(
            DistributionType.CHI_SQUARE,
            { df } as ChiSquareParameters
        );
    }
    
    /**
     * Validates CHI_SQUARE distribution parameters
     */
    static validateParameters(params: ChiSquareParameters): boolean {
        return (
            typeof params.df === 'number' &&
            params.df >= 1 &&
            params.df === Math.floor(params.df)
        );
    }
    
    /**
     * Gets the effective value of a CHI_SQUARE distribution (mean)
     */
    static getEffectiveValue(params: ChiSquareParameters): number {
        return params.df;
    }
}
