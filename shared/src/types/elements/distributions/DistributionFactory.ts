import { Distribution, DistributionParameters } from '../Distribution';
import { DistributionType } from '../DistributionType';
import { Duration} from '../Duration';
import { DurationType } from '../DurationType';

// Import distribution implementations
import {
    ConstantDistribution, ConstantParameters,
    UniformDistribution, UniformParameters,
    TriangularDistribution, TriangularParameters,
    NormalDistribution, NormalParameters,
    ExponentialDistribution, ExponentialParameters
} from './index';

/**
 * Creates a default distribution of the specified type
 */
export function createDefaultDistribution(type: DistributionType): Distribution {
    switch (type) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.createDefault();
        case DistributionType.UNIFORM:
            return UniformDistribution.createDefault();
        case DistributionType.TRIANGULAR:
            return TriangularDistribution.createDefault();
        case DistributionType.NORMAL:
            return NormalDistribution.createDefault();
        case DistributionType.EXPONENTIAL:
            return ExponentialDistribution.createDefault();
        default:
            // Default to CONSTANT if type is not supported
            return ConstantDistribution.createDefault();
    }
}

/**
 * Gets a representative value of a distribution (mean, mode, etc.)
 * Useful for UI display or calculations
 */
export function getDistributionEffectiveValue(distribution: Distribution): number {
    switch (distribution.distributionType) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.getEffectiveValue(distribution.parameters as ConstantParameters);
        case DistributionType.UNIFORM:
            return UniformDistribution.getEffectiveValue(distribution.parameters as UniformParameters);
        case DistributionType.TRIANGULAR:
            return TriangularDistribution.getEffectiveValue(distribution.parameters as TriangularParameters);
        case DistributionType.NORMAL:
            return NormalDistribution.getEffectiveValue(distribution.parameters as NormalParameters);
        case DistributionType.EXPONENTIAL:
            return ExponentialDistribution.getEffectiveValue(distribution.parameters as ExponentialParameters);
        default:
            return 0;
    }
}

/**
 * Validates parameters for a specific distribution type
 * Returns true if valid, false otherwise
 */
export function validateDistributionParameters(
    type: DistributionType,
    parameters: DistributionParameters
): boolean {
    switch (type) {
        case DistributionType.CONSTANT:
            return ConstantDistribution.validateParameters(parameters as ConstantParameters);
        case DistributionType.UNIFORM:
            return UniformDistribution.validateParameters(parameters as UniformParameters);
        case DistributionType.TRIANGULAR:
            return TriangularDistribution.validateParameters(parameters as TriangularParameters);
        case DistributionType.NORMAL:
            return NormalDistribution.validateParameters(parameters as NormalParameters);
        case DistributionType.EXPONENTIAL:
            return ExponentialDistribution.validateParameters(parameters as ExponentialParameters);
        default:
            return false;
    }
}
