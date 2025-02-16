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
import { DurationType } from '../../../../src/types/elements/DurationType';
import { createOperationStep } from '../../../../src/types/elements/OperationStep';
import { ConnectType } from '../../../../src/types/elements/ConnectType';

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
    const duration = new Duration(1, PeriodUnit.MINUTES, DurationType.CONSTANT);
    
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
    const generator = new Generator(
        'generator-1',
        'Generator1',
        activity1.id,
        entity.id,
        10,
        new Duration(1, PeriodUnit.HOURS, DurationType.CONSTANT),
        1
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

    const connector12 = new Connector(
        'connector-2',
        'Activity1ToActivity2',
        activity1.id,
        activity2.id,
        1.0,
        ConnectType.Probability
    );

    const connector23 = new Connector(
        'connector-3',
        'Activity2ToActivity3',
        activity2.id,
        activity3.id,
        1.0,
        ConnectType.Probability
    );

    modelDef.connectors.add(connectorGen);
    modelDef.connectors.add(connector12);
    modelDef.connectors.add(connector23);

    return modelDef;
}