import { Model } from '../../../../src/types/elements/Model';
import { ModelDefinition } from '../../../../src/types/elements/ModelDefinition';
import { Activity } from '../../../../src/types/elements/Activity';
import { Generator } from '../../../../src/types/elements/Generator';
import { Resource } from '../../../../src/types/elements/Resource';
import { ResourceRequirement } from '../../../../src/types/elements/ResourceRequirement';
import { Connector } from '../../../../src/types/elements/Connector';
import { Entity } from '../../../../src/types/elements/Entity';
import { Duration } from '../../../../src/types/elements/Duration';
import { PeriodUnit } from '../../../../src/types/elements/PeriodUnit';
import { ConstantDistribution } from '../../../../src/types/elements/distributions';
import { createDelayWithResourceAction } from '../../../../src/types/elements/actions/DelayWithResourceAction';
import { EntitySourceConfig } from '../../../../src/types/elements/EntitySourceConfig';
import { GeneratorType } from '../../../../src/types/elements/GeneratorType';

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