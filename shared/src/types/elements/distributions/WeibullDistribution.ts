import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a WEIBULL distribution type.
 */
export interface WeibullParameters {
    a: number;
}

/**
 * Default parameters for WEIBULL distribution.
 */
export const DEFAULT_WEIBULL_PARAMETERS: WeibullParameters = {
    a: 1
};

/**
 * Metadata for WeibullParameters fields.
 */
export const WEIBULL_PARAMETER_METADATA: Record<keyof WeibullParameters, ParameterMetadata> = {
    a: {
        label: "Shape",
        description: "The shape parameter of the Weibull distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Weibull distributions
 */
export class WeibullDistribution {
    /**
     * Creates a default WEIBULL distribution
     */
    static createDefault(): Distribution {
        return WeibullDistribution.create(DEFAULT_WEIBULL_PARAMETERS.a);
    }
    
    /**
     * Creates a WEIBULL distribution with the specified parameters
     */
    static create(a: number): Distribution {
        return new Distribution(
            DistributionType.WEIBULL,
            { a } as WeibullParameters
        );
    }
    
    /**
     * Validates WEIBULL distribution parameters
     */
    static validateParameters(params: WeibullParameters): boolean {
        return typeof params.a === 'number' && params.a > 0;
    }
    
    /**
     * Gets the effective value of a WEIBULL distribution
     * For this simple implementation, we just return the shape parameter
     */
    static getEffectiveValue(params: WeibullParameters): number {
        return params.a;
    }
}
