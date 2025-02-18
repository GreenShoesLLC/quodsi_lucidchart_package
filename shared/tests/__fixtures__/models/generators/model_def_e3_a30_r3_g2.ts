import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { createModelDefinition } from './template_generator';

export function createmodel_def_e3_a30_r3_g2(): ModelDefinition {
    return createModelDefinition({
        entityCount: 3,
        activityCount: 30,
        resourceCount: 3,
        generatorCount: 2
    }, 9);
}
