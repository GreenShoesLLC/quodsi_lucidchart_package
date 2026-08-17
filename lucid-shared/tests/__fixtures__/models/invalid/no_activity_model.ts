// tests/__fixtures__/models/invalid/no_activity_model.ts


import { ModelDefinition } from '@quodsi/shared';
import { Generator } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { ResourceRequirement } from '@quodsi/shared';
import { Entity } from '@quodsi/shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { DurationType } from '@quodsi/shared';
import { Model } from '@quodsi/lucid-shared';
import { GeneratorType } from '@quodsi/shared';
import { ConstantDistribution } from '@quodsi/shared';

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

    // Create generator. The model is invalid because there are no
    // Activities at all (not because of any dangling exit-connector
    // reference — that old concept no longer exists; `EntitySourceConfig`
    // was dissolved flat onto `Generator`, wire-cleanup Phase B2 Task 5).
    const generator = new Generator(
        'generator-1',
        'Generator1',
        entity.id,
        Duration.fromDistribution(PeriodUnit.HOURS, ConstantDistribution.create(1))
    );
    generator.mode = GeneratorType.FREQUENCY;
    generator.maxCycles = 10;
    generator.batchSize = 1;
    generator.startDelay = Duration.constant(0, PeriodUnit.HOURS);
    generator.maxEntities = 999999;
    generator.initialStates = [];
    modelDef.generators.add(generator);

    return modelDef;
}