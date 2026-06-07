import { Distribution } from "../Distribution";
import { DistributionType } from "../DistributionType";
import { ParameterMetadata } from "./ConstantDistribution";

/**
 * Parameters for a ZIPF distribution type.
 */
export interface ZipfParameters {
    a: number;
}

/**
 * Default parameters for ZIPF distribution.
 */
export const DEFAULT_ZIPF_PARAMETERS: ZipfParameters = {
    a: 2
};

/**
 * Metadata for ZipfParameters fields.
 */
export const ZIPF_PARAMETER_METADATA: Record<keyof ZipfParameters, ParameterMetadata> = {
    a: {
        label: "Alpha",
        description: "The exponent parameter",
        min: 1.01,
        step: 0.1
    }
};

/**
 * Functions for working with Zipf distributions
 */
export class ZipfDistribution {
    /**
     * Creates a default ZIPF distribution
     */
    static createDefault(): Distribution {
        return ZipfDistribution.create(DEFAULT_ZIPF_PARAMETERS.a);
    }
    
    /**
     * Creates a ZIPF distribution with the specified parameter
     */
    static create(a: number): Distribution {
        return new Distribution(
            DistributionType.ZIPF,
            { a } as ZipfParameters
        );
    }
    
    /**
     * Validates ZIPF distribution parameters
     */
    static validateParameters(params: ZipfParameters): boolean {
        return typeof params.a === 'number' && params.a > 1;
    }
    
    /**
     * Gets the effective value of a ZIPF distribution
     * For simplicity, return the parameter value
     */
    static getEffectiveValue(params: ZipfParameters): number {
        return params.a;
    }
}
