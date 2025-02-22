// tests/__fixtures__/models/invalid/no_generator_model.ts
import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { Activity } from '../../../../src/types/elements/Activity';
import { Resource } from '../../../../src/types/elements/Resource';
import { ResourceRequirement } from '../../../../src/types/elements/ResourceRequirement';
import { Entity } from '../../../../src/types/elements/Entity';
import { Duration } from '../../../../src/types/elements/Duration';
import { PeriodUnit } from '../../../../src/types/elements/PeriodUnit';
import { DurationType } from '../../../../src/types/elements/DurationType';
import { createOperationStep } from '../../../../src/types/elements/OperationStep';
import { Model } from '../../../../src/types/elements/Model';

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
    const duration = new Duration(1, PeriodUnit.MINUTES, DurationType.CONSTANT);

    // Create operation step template
    const operationStep = createOperationStep(duration, {
        requirementId: resourceReq.id,
        quantity: 1
    });

    // Create activity (which will be disconnected since there's no generator)
    const activity = new Activity('activity-1', 'Activity1', 1, 1, 1, [operationStep]);
    modelDef.activities.add(activity);

    return modelDef;
}