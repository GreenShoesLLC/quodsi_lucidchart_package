import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a BETA distribution type.
 */
export interface BetaParameters {
    alpha: number;
    beta: number;
}

/**
 * Default parameters for BETA distribution.
 */
export const DEFAULT_BETA_PARAMETERS: BetaParameters = {
    alpha: 2,
    beta: 5
};

/**
 * Metadata for BetaParameters fields.
 */
export const BETA_PARAMETER_METADATA: Record<keyof BetaParameters, ParameterMetadata> = {
    alpha: {
        label: "Alpha",
        description: "The alpha parameter of the beta distribution",
        min: 0.01,
        step: 0.1
    },
    beta: {
        label: "Beta",
        description: "The beta parameter of the beta distribution",
        min: 0.01,
        step: 0.1
    }
};

/**
 * Functions for working with Beta distributions
 */
export class BetaDistribution {
    /**
     * Creates a default BETA distribution
     */
    static createDefault(): Distribution {
        return BetaDistribution.create(
            DEFAULT_BETA_PARAMETERS.alpha,
            DEFAULT_BETA_PARAMETERS.beta
        );
    }
    
    /**
     * Creates a BETA distribution with the specified parameters
     */
    static create(alpha: number, beta: number): Distribution {
        return new Distribution(
            DistributionType.BETA,
            { alpha, beta } as BetaParameters
        );
    }
    
    /**
     * Validates BETA distribution parameters
     */
    static validateParameters(params: BetaParameters): boolean {
        return (
            typeof params.alpha === 'number' &&
            typeof params.beta === 'number' &&
            params.alpha > 0 &&
            params.beta > 0
        );
    }
    
    /**
     * Gets the effective value of a BETA distribution (mean)
     */
    static getEffectiveValue(params: BetaParameters): number {
        // Mean of Beta(alpha, beta) is alpha / (alpha + beta)
        return params.alpha / (params.alpha + params.beta);
    }
}
