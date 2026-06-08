import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';

/**
 * Parameters for a CONSTANT distribution type.
 * This represents a constant value that does not vary.
 */
export interface ConstantParameters {
    /**
     * The constant value to use.
     */
    value: number;
}

/**
 * Default parameters for CONSTANT distribution.
 */
export const DEFAULT_CONSTANT_PARAMETERS: ConstantParameters = {
    value: 1
};

/**
 * Metadata for parameter fields.
 */
export interface ParameterMetadata {
    label: string;
    description: string;
    min?: number;
    max?: number;
    step?: number;
}

/**
 * Metadata for ConstantParameters fields.
 */
export const CONSTANT_PARAMETER_METADATA: Record<keyof ConstantParameters, ParameterMetadata> = {
    value: {
        label: "Value",
        description: "The constant duration value",
        min: 0,
        step: 0.1
    }
};

/**
 * Functions for working with Constant distributions
 */
export class ConstantDistribution {
    /**
     * Creates a default CONSTANT distribution
     */
    static createDefault(): Distribution {
        return ConstantDistribution.create(DEFAULT_CONSTANT_PARAMETERS.value);
    }
    
    /**
     * Creates a CONSTANT distribution with the specified value
     */
    static create(value: number): Distribution {
        return new Distribution(
            DistributionType.CONSTANT,
            { value } as ConstantParameters
        );
    }
    
    /**
     * Validates CONSTANT distribution parameters
     */
    static validateParameters(params: ConstantParameters): boolean {
        return typeof params.value === 'number' && params.value >= 0;
    }
    
    /**
     * Gets the effective value of a CONSTANT distribution
     */
    static getEffectiveValue(params: ConstantParameters): number {
        return params.value;
    }
}
