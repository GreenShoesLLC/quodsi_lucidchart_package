import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { createModelDefinition } from '../generators/template_generator';
import { DistributionType } from '../../../../src/types/elements/DistributionType';

export function createModelWithMixedDistributions(): ModelDefinition {
    return createModelDefinition({
        entityCount: 2,
        activityCount: 3,
        resourceCount: 2,
        generatorCount: 1,
        distributions: {
            default: DistributionType.CONSTANT,
            activities: {
                0: DistributionType.NORMAL,      // First activity uses normal distribution
                1: DistributionType.TRIANGULAR,  // Second activity uses triangular distribution
                // Third activity uses the default (constant)
            },
            generators: {
                0: DistributionType.UNIFORM      // Generator uses uniform distribution
            }
        }
    }, 100); // Use a high index to avoid collisions
}
