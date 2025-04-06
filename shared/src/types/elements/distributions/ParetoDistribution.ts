import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a PARETO distribution type.
 */
export interface ParetoParameters {
    a: number;
}

/**
 * Default parameters for PARETO distribution.
 */
export const DEFAULT_PARETO_PARAMETERS: ParetoParameters = {
    a: 3
};

/**
 * Metadata for ParetoParameters fields.
 */
export const PARETO_PARAMETER_METADATA: Record<keyof ParetoParameters, ParameterMetadata> = {
    a: {
        label: "Alpha",
        description: "The shape parameter of the Pareto distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Pareto distributions
 */
export class ParetoDistribution {
    /**
     * Creates a default PARETO distribution
     */
    static createDefault(): Distribution {
        return ParetoDistribution.create(DEFAULT_PARETO_PARAMETERS.a);
    }
    
    /**
     * Creates a PARETO distribution with the specified parameter
     */
    static create(a: number): Distribution {
        return new Distribution(
            DistributionType.PARETO,
            { a } as ParetoParameters
        );
    }
    
    /**
     * Validates PARETO distribution parameters
     */
    static validateParameters(params: ParetoParameters): boolean {
        return typeof params.a === 'number' && params.a > 0;
    }
    
    /**
     * Gets the effective value of a PARETO distribution (mean if defined)
     */
    static getEffectiveValue(params: ParetoParameters): number {
        // Mean = a/(a-1) for a > 1, otherwise undefined
        if (params.a > 1) {
            return params.a / (params.a - 1);
        }
        // Return a reasonable value if mean is undefined
        return params.a + 1;
    }
}
