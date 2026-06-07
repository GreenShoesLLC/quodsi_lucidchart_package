import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { createModelDefinition } from './template_generator';

export function createmodel_def_e1_a2_r2_g1(): ModelDefinition {
    return createModelDefinition({
        entityCount: 1,
        activityCount: 2,
        resourceCount: 2,
        generatorCount: 1
    }, 8);
}
