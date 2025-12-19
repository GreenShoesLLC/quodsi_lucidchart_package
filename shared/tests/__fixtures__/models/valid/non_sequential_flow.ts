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
import { Distribution } from '../../../../src/types/elements/Distribution';
import { ConstantDistribution } from '../../../../src/types/elements/distributions';
import { createOperationStep } from '../../../../src/types/elements/OperationStep';
import { ConnectType } from '../../../../src/types/elements/ConnectType';
import { EntitySourceConfig, GeneratorType } from '../../../../src/types/elements/EntitySourceConfig';

export function createNonSequentialFlowModel(): ModelDefinition {
    // Create base model
    const model = Model.createDefault('model-non-sequential');
    model.name = 'Non-Sequential Flow Model';
    
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
    
    // Create operation step template
    const operationStep = createOperationStep(duration, {
        requirementId: resourceReq.id,
        quantity: 1
    });

    // Create activities
    const activity1 = new Activity('activity-1', 'Activity1', 1, 1, 1, [operationStep]);
    const activity2 = new Activity('activity-2', 'Activity2', 1, 1, 1, [operationStep]);
    const activity3 = new Activity('activity-3', 'Activity3', 1, 1, 1, [operationStep]);
    
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
        1.0,
        ConnectType.Probability
    );

    // Create split connectors from Activity1 to Activity2 and Activity3
    const connector12 = new Connector(
        'connector-2',
        'Activity1ToActivity2',
        activity1.id,
        activity2.id,
        0.5,  // 50% probability
        ConnectType.Probability
    );

    const connector13 = new Connector(
        'connector-3',
        'Activity1ToActivity3',
        activity1.id,
        activity3.id,
        0.5,  // 50% probability
        ConnectType.Probability
    );

    modelDef.connectors.add(connectorGen);
    modelDef.connectors.add(connector12);
    modelDef.connectors.add(connector13);

    return modelDef;
}