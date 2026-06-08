import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a LOGISTIC distribution type.
 */
export interface LogisticParameters {
    loc: number;
    scale: number;
}

/**
 * Default parameters for LOGISTIC distribution.
 */
export const DEFAULT_LOGISTIC_PARAMETERS: LogisticParameters = {
    loc: 0,
    scale: 1
};

/**
 * Metadata for LogisticParameters fields.
 */
export const LOGISTIC_PARAMETER_METADATA: Record<keyof LogisticParameters, ParameterMetadata> = {
    loc: {
        label: "Location",
        description: "The location parameter (mean)",
        step: 0.1
    },
    scale: {
        label: "Scale",
        description: "The scale parameter",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Logistic distributions
 */
export class LogisticDistribution {
    /**
     * Creates a default LOGISTIC distribution
     */
    static createDefault(): Distribution {
        return LogisticDistribution.create(
            DEFAULT_LOGISTIC_PARAMETERS.loc,
            DEFAULT_LOGISTIC_PARAMETERS.scale
        );
    }
    
    /**
     * Creates a LOGISTIC distribution with the specified parameters
     */
    static create(loc: number, scale: number): Distribution {
        return new Distribution(
            DistributionType.LOGISTIC,
            { loc, scale } as LogisticParameters
        );
    }
    
    /**
     * Validates LOGISTIC distribution parameters
     */
    static validateParameters(params: LogisticParameters): boolean {
        return (
            typeof params.loc === 'number' &&
            typeof params.scale === 'number' &&
            params.scale > 0
        );
    }
    
    /**
     * Gets the effective value of a LOGISTIC distribution (mean)
     */
    static getEffectiveValue(params: LogisticParameters): number {
        return params.loc;
    }
}
