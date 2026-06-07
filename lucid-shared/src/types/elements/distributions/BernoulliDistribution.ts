import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a BERNOULLI distribution type.
 */
export interface BernoulliParameters {
    p: number;
}

/**
 * Default parameters for BERNOULLI distribution.
 */
export const DEFAULT_BERNOULLI_PARAMETERS: BernoulliParameters = {
    p: 0.5
};

/**
 * Metadata for BernoulliParameters fields.
 */
export const BERNOULLI_PARAMETER_METADATA: Record<keyof BernoulliParameters, ParameterMetadata> = {
    p: {
        label: "P",
        description: "The probability of success (1)",
        min: 0,
        max: 1,
        step: 0.01
    }
};

/**
 * Functions for working with Bernoulli distributions
 */
export class BernoulliDistribution {
    /**
     * Creates a default BERNOULLI distribution
     */
    static createDefault(): Distribution {
        return BernoulliDistribution.create(DEFAULT_BERNOULLI_PARAMETERS.p);
    }
    
    /**
     * Creates a BERNOULLI distribution with the specified probability
     */
    static create(p: number): Distribution {
        return new Distribution(
            DistributionType.BERNOULLI,
            { p } as BernoulliParameters
        );
    }
    
    /**
     * Validates BERNOULLI distribution parameters
     */
    static validateParameters(params: BernoulliParameters): boolean {
        return typeof params.p === 'number' && params.p >= 0 && params.p <= 1;
    }
    
    /**
     * Gets the effective value of a BERNOULLI distribution (mean)
     */
    static getEffectiveValue(params: BernoulliParameters): number {
        return params.p;
    }
}
