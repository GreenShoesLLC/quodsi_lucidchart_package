import { Model } from '@quodsi/lucid-shared';
import { ModelDefinition } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Generator } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { ResourceRequirement } from '@quodsi/shared';
import { Connector } from '@quodsi/shared';
import { Entity } from '@quodsi/shared';
import { Duration } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { ConstantDistribution } from '../../../../src/types/elements/distributions';
import { createDelayWithResourceAction } from '../../../../src/types/elements/actions/DelayWithResourceAction';
import { EntitySourceConfig } from '@quodsi/shared';
import { GeneratorType } from '@quodsi/lucid-shared';

export function createSequentialFlowModel(): ModelDefinition {
    // Create base model
    const model = Model.createDefault('model-1');
    model.name = 'Sequential Flow Model';
    
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

    // Create activities
    const activity1 = new Activity('activity-1', 'Activity1', 1, 1, 1, [action]);
    const activity2 = new Activity('activity-2', 'Activity2', 1, 1, 1, [action]);
    const activity3 = new Activity('activity-3', 'Activity3', 1, 1, 1, [action]);
    
    modelDef.activities.add(activity1);
    modelDef.activities.add(activity2);
    modelDef.activities.add(activity3);

    // Create generator
    const generationConfig: EntitySourceConfig = {
        entityId: entity.id,
        generatorType: GeneratorType.FREQUENCY,
        periodicOccurrences: 10,
        periodIntervalDuration: new Duration(PeriodUnit.HOURS, ConstantDistribution.create(1)),
        entitiesPerCreation: 1,
        periodicStartDuration: new Duration(PeriodUnit.HOURS, ConstantDistribution.create(0)),
        maxEntities: 999999,
        timeDistributedConfigIds: [],
        initialStateModifications: []
    };
    const generator = new Generator(
        'generator-1',
        'Generator1',
        generationConfig,
        activity1.id // exitConnector
    );
    modelDef.generators.add(generator);

    // Create connectors
    const connectorGen = new Connector(
        'connector-1',
        'GeneratorToActivity1',
        generator.id,
        activity1.id,
        1.0
    );

    const connector12 = new Connector(
        'connector-2',
        'Activity1ToActivity2',
        activity1.id,
        activity2.id,
        1.0
    );

    const connector23 = new Connector(
        'connector-3',
        'Activity2ToActivity3',
        activity2.id,
        activity3.id,
        1.0
    );

    modelDef.connectors.add(connectorGen);
    modelDef.connectors.add(connector12);
    modelDef.connectors.add(connector23);

    return modelDef;
}