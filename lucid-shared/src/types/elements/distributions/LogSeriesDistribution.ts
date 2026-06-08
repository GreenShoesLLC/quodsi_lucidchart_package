import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a LOG_SERIES distribution type.
 */
export interface LogSeriesParameters {
    p: number;
}

/**
 * Default parameters for LOG_SERIES distribution.
 */
export const DEFAULT_LOG_SERIES_PARAMETERS: LogSeriesParameters = {
    p: 0.5
};

/**
 * Metadata for LogSeriesParameters fields.
 */
export const LOG_SERIES_PARAMETER_METADATA: Record<keyof LogSeriesParameters, ParameterMetadata> = {
    p: {
        label: "P",
        description: "The probability parameter",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Log Series distributions
 */
export class LogSeriesDistribution {
    /**
     * Creates a default LOG_SERIES distribution
     */
    static createDefault(): Distribution {
        return LogSeriesDistribution.create(DEFAULT_LOG_SERIES_PARAMETERS.p);
    }
    
    /**
     * Creates a LOG_SERIES distribution with the specified parameter
     */
    static create(p: number): Distribution {
        return new Distribution(
            DistributionType.LOG_SERIES,
            { p } as LogSeriesParameters
        );
    }
    
    /**
     * Validates LOG_SERIES distribution parameters
     */
    static validateParameters(params: LogSeriesParameters): boolean {
        return typeof params.p === 'number' && params.p > 0 && params.p < 1;
    }
    
    /**
     * Gets the effective value of a LOG_SERIES distribution (mean)
     */
    static getEffectiveValue(params: LogSeriesParameters): number {
        // Mean = -p / ((1-p) * ln(1-p))
        const p = params.p;
        return -p / ((1 - p) * Math.log(1 - p));
    }
}
