import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { createModelDefinition } from '../generators/template_generator';

export function createModel_def_e1_a1_r2_g1(): ModelDefinition {
    return createModelDefinition({
        entityCount: 1,
        activityCount: 1,
        resourceCount: 2,
        generatorCount: 1
    }, 6);
}
