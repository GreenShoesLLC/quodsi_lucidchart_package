import { Distribution, DistributionParameters } from '../Distribution';
import { DistributionType } from '../DistributionType';
/**
 * Creates a default distribution of the specified type
 */
export declare function createDefaultDistribution(type: DistributionType): Distribution;
/**
 * Gets a representative value of a distribution (mean, mode, etc.)
 * Useful for UI display or calculations
 */
export declare function getDistributionEffectiveValue(distribution: Distribution): number;
/**
 * Validates parameters for a specific distribution type
 * Returns true if valid, false otherwise
 */
export declare function validateDistributionParameters(type: DistributionType, parameters: DistributionParameters): boolean;
//# sourceMappingURL=DistributionFactory.d.ts.map