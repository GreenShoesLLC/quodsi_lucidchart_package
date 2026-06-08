// tests/__fixtures__/models/invalid/no_generator_model.ts
import { ModelDefinition } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { ResourceRequirement } from '@quodsi/shared';
import { Entity } from '@quodsi/shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { ConstantDistribution } from '@quodsi/shared';
import { createDelayWithResourceAction } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';

export function createNoGeneratorModel(): ModelDefinition {
    // Create base model
    const model = Model.createDefault('invalid-model-2');
    model.name = 'Invalid Model - No Generators';

    // Create model definition
    const modelDef = new ModelDefinition(model);

    // Create resource
    const resource = new Resource('resource-1', 'Resource1', 1);
    modelDef.resources.add(resource);

    // Create resource requirement
    const resourceReq = ResourceRequirement.createForSingleResource(resource);
    modelDef.resourceRequirements.add(resourceReq);

    // Create entity (beyond default)
    const entity = new Entity('entity-1', 'Entity1');
    modelDef.entities.add(entity);

    // Create common duration for activities
    const duration = new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1));

    // Create action template with resource requirement
    const action = createDelayWithResourceAction(duration, {
        resourceRequirementId: resourceReq.id
    });

    // Create activity (which will be disconnected since there's no generator)
    const activity = new Activity('activity-1', 'Activity1', 1, 1, 1, [action]);
    modelDef.activities.add(activity);

    return modelDef;
}