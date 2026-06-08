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
import { Distribution } from '@quodsi/shared';
import { DistributionType } from '@quodsi/shared';
import { ConstantDistribution } from '../../../../src/types/elements/distributions';
import { UniformParameters, TriangularParameters, NormalParameters } from '../../../../src/types/elements/distributions';
import { createDelayWithResourceAction } from '../../../../src/types/elements/actions/DelayWithResourceAction';
import { createDelayAction } from '../../../../src/types/elements/actions/DelayAction';
import { EntitySourceConfig } from '@quodsi/shared';
import { GeneratorType } from '@quodsi/lucid-shared';

interface ModelConfig {
    entityCount: number;
    activityCount: number;
    resourceCount: number;
    generatorCount: number;
    distributions?: {
        // Default distribution for all components if not specifically mapped
        default?: DistributionType;
        
        // Specific mapping for activities
        activities?: Record<number, DistributionType>;
        
        // Specific mapping for generators
        generators?: Record<number, DistributionType>;
    };
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

    // Helper function to create appropriate distribution based on type
    function createDistributionByType(type: DistributionType): Distribution {
        switch (type) {
            case DistributionType.CONSTANT:
                return ConstantDistribution.create(1);
                
            case DistributionType.UNIFORM:
                return new Distribution(
                    DistributionType.UNIFORM, 
                    { low: 0.5, high: 1.5 } as UniformParameters
                );
                
            case DistributionType.TRIANGULAR:
                return new Distribution(
                    DistributionType.TRIANGULAR, 
                    { left: 0.5, mode: 1.0, right: 1.5 } as TriangularParameters
                );
                
            case DistributionType.NORMAL:
                return new Distribution(
                    DistributionType.NORMAL, 
                    { mean: 1.0, std: 0.2 } as NormalParameters
                );
                
            default:
                return ConstantDistribution.create(1);
        }
    }
    
    // Helper function to get distribution for a specific component
    function getDistributionForIndex(
        index: number, 
        componentType: 'activity' | 'generator'
    ): Distribution {
        // Check if there's a specific mapping for this component
        const specificMapping = componentType === 'activity' 
            ? config.distributions?.activities?.[index]
            : config.distributions?.generators?.[index];
            
        // Use specific mapping if available, otherwise use default, falling back to CONSTANT
        const distributionType = specificMapping || 
            config.distributions?.default || 
            DistributionType.CONSTANT;
            
        // Create the appropriate distribution with sensible parameters
        return createDistributionByType(distributionType);
    }
    
    // Create common duration for activities - default for when no specific one is needed
    const defaultDuration = new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1));

    // Create activities with dedicated actions
    const activities: Activity[] = [];
    for (let i = 0; i < config.activityCount; i++) {
        // Get distribution for this activity
        const activityDistribution = getDistributionForIndex(i, 'activity');
        const activityDuration = new Duration(PeriodUnit.MINUTES, activityDistribution);

        // Create actions for this activity
        const actions = requirements.length > 0
            ? requirements.map(req => createDelayWithResourceAction(activityDuration, {
                resourceRequirementId: req.id
              }))
            : [createDelayAction(activityDuration)]; // If no resources, create delay action without resource

        const activity = new Activity(
            `activity-${i + 1}`,
            `Activity${i + 1}`,
            1, 1, 1,
            actions
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
        const generationConfig: EntitySourceConfig = {
            entityId: entityForGenerator.id,
            generatorType: GeneratorType.FREQUENCY,
            periodicOccurrences: 10,
            periodIntervalDuration: new Duration(PeriodUnit.HOURS, getDistributionForIndex(i, 'generator')),
            entitiesPerCreation: 1,
            periodicStartDuration: new Duration(PeriodUnit.HOURS, ConstantDistribution.create(0)),
            maxEntities: 999999,
            timeDistributedConfigIds: [],
            initialStateModifications: []
        };
        const generator = new Generator(
            `generator-${i + 1}`,
            `Generator${i + 1}`,
            generationConfig,
            activities[0].id // exitConnector
        );
        modelDef.generators.add(generator);

        // Create connector from generator to first activity
        const connectorGen = new Connector(
            `connector-gen-${i + 1}`,
            `Generator${i + 1}ToActivity1`,
            generator.id,
            activities[0].id,
            1.0 / config.generatorCount // Split probability among generators
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
            1.0
        );
        modelDef.connectors.add(connector);
    }

    return modelDef;
}