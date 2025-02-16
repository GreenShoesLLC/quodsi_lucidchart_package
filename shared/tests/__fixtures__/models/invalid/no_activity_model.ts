// tests/__fixtures__/models/invalid/no_activity_model.ts


import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { Activity } from '../../../../src/types/elements/Activity';
import { Generator } from '../../../../src/types/elements/Generator';
import { Resource } from '../../../../src/types/elements/Resource';
import { ResourceRequirement } from '../../../../src/types/elements/ResourceRequirement';
import { Connector } from '../../../../src/types/elements/Connector';
import { Entity } from '../../../../src/types/elements/Entity';
import { Duration } from '../../../../src/types/elements/Duration';
import { PeriodUnit } from '../../../../src/types/elements/PeriodUnit';
import { DurationType } from '../../../../src/types/elements/DurationType';
import { createOperationStep } from '../../../../src/types/elements/OperationStep';
import { ConnectType } from '../../../../src/types/elements/ConnectType';
import { Model } from '../../../../src/types/elements/Model';

export function createNoActivityModel(): ModelDefinition {
    // Create base model
    const model = Model.createDefault('invalid-model-1');
    model.name = 'Invalid Model - No Activities';

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

    // Create generator (which will be invalid since there's no activity to connect to)
    const generator = new Generator(
        'generator-1',
        'Generator1',
        'non-existent-activity', // This will cause validation error
        entity.id,
        10,
        new Duration(1, PeriodUnit.HOURS, DurationType.CONSTANT),
        1
    );
    modelDef.generators.add(generator);

    return modelDef;
}