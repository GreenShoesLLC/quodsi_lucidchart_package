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
import { ModelDefaults } from '../../../../src/types/elements/ModelDefaults';

interface ModelConfig {
    entityCount: number;
    activityCount: number;
    resourceCount: number;
    generatorCount: number;
}

export function createModelDefinition(config: ModelConfig, index: number): ModelDefinition {
    const modelId = `model-${index}`;
    const model = Model.createDefault(modelId);
    model.name = `Model E${config.entityCount}A${config.activityCount}R${config.resourceCount}G${config.generatorCount}`;
    
    const modelDef = new ModelDefinition(model);

    // Create resources and requirements
    const resources: Resource[] = [];
    const requirements: ResourceRequirement[] = [];
    for (let i = 0; i < config.resourceCount; i++) {
        const resource = new Resource(`resource-${i + 1}`, `Resource${i + 1}`, 1);
        modelDef.resources.add(resource);
        resources.push(resource);

        // Create corresponding requirement
        const resourceReq = ResourceRequirement.createForSingleResource(resource);
        modelDef.resourceRequirements.add(resourceReq);
        requirements.push(resourceReq);
    }

    // Create entities (beyond default)
    const entities: Entity[] = [];
    for (let i = 0; i < config.entityCount; i++) {
        const entity = new Entity(`entity-${i + 1}`, `Entity${i + 1}`);
        modelDef.entities.add(entity);
        entities.push(entity);
    }

    // Create common duration for activities
    const duration = new Duration(1, PeriodUnit.MINUTES, DurationType.CONSTANT);
    
    // Create operation step template - uses first resource if available
    const operationStep = createOperationStep(duration, resources.length > 0 ? {
        requirementId: requirements[0].id,
        quantity: 1
    } : undefined);

    // Create activities
    const activities: Activity[] = [];
    for (let i = 0; i < config.activityCount; i++) {
        const activity = new Activity(
            `activity-${i + 1}`,
            `Activity${i + 1}`,
            1, 1, 1,
            [operationStep]
        );
        modelDef.activities.add(activity);
        activities.push(activity);
    }

    // Find an entity to use for generators (use custom entity if available, otherwise default)
    let entityForGenerator: Entity;
    if (entities.length > 0) {
        entityForGenerator = entities[0];
    } else {
        // Get the default entity from the list manager
        entityForGenerator = modelDef.entities.getAll()[0];
    }

    // Create generators
    for (let i = 0; i < config.generatorCount; i++) {
        const generator = new Generator(
            `generator-${i + 1}`,
            `Generator${i + 1}`,
            activities[0].id, // Always connect to first activity
            entityForGenerator.id,
            10,
            new Duration(1, PeriodUnit.HOURS, DurationType.CONSTANT),
            1
        );
        modelDef.generators.add(generator);

        // Create connector from generator to first activity
        const connectorGen = new Connector(
            `connector-gen-${i + 1}`,
            `Generator${i + 1}ToActivity1`,
            generator.id,
            activities[0].id,
            1.0 / config.generatorCount, // Split probability among generators
            ConnectType.Probability
        );
        modelDef.connectors.add(connectorGen);
    }

    // Create sequential connectors between activities
    for (let i = 0; i < activities.length - 1; i++) {
        const connector = new Connector(
            `connector-${i + 1}`,
            `Activity${i + 1}ToActivity${i + 2}`,
            activities[i].id,
            activities[i + 1].id,
            1.0,
            ConnectType.Probability
        );
        modelDef.connectors.add(connector);
    }

    return modelDef;
}
