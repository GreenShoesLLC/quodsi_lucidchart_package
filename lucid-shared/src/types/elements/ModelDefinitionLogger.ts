// shared/src/types/elements/ModelDefinitionLogger.ts
import { ModelDefinition } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Connector } from '@quodsi/shared';
import { Resource } from '@quodsi/shared';
import { Generator } from '@quodsi/shared';
import { Entity } from '@quodsi/shared';
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";
import { ResourceRequirement } from '@quodsi/shared';

export class ModelDefinitionLogger extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[ModelDefinitionLogger]';

    public static logModelDefinition(modelDefinition: ModelDefinition): void {
        const logger = new ModelDefinitionLogger();
        logger.setLogging(false);
        logger.logDefinition(modelDefinition);
    }

    private logDefinition(modelDefinition: ModelDefinition): void {
        this.log("\nLogging Model Definition:");

        try {
            // Log basic model details
            this.log(`Model ID: ${modelDefinition.id}`);
            this.log(`Model Name: ${modelDefinition.name}`);

            this.logActivities(modelDefinition);
            this.logConnectors(modelDefinition);
            this.logResources(modelDefinition);
            this.logGenerators(modelDefinition);
            this.logEntities(modelDefinition);
        } catch (error) {
            this.logError("An error occurred while logging the model definition:", error);
        }
    }

    private logActivities(modelDefinition: ModelDefinition): void {
        this.log("\nActivities:");
        const activities = modelDefinition.activities.getAll();
        activities.forEach(activity => this.safeExecute(() => this.logActivity(activity), `Activity ID: ${activity?.id}`));
    }

    private logConnectors(modelDefinition: ModelDefinition): void {
        this.log("\nConnectors:");
        const connectors = modelDefinition.connectors.getAll();
        connectors.forEach(connector => this.safeExecute(() => this.logConnector(connector), `Connector ID: ${connector?.id}`));
    }

    private logResources(modelDefinition: ModelDefinition): void {
        this.log("\nResources:");
        const resources = modelDefinition.resources.getAll();
        resources.forEach(resource => this.safeExecute(() => this.logResource(resource), `Resource ID: ${resource?.id}`));
    }

    private logResourceRequirements(modelDefinition: ModelDefinition): void {
        this.log("\ResourceRequirement:");
        const requirements = modelDefinition.resourceRequirements.getAll();
        requirements.forEach(requirement => this.safeExecute(() => this.logResourceRequirement(requirement), `Resource ID: ${requirement?.id}`));
    }

    private logGenerators(modelDefinition: ModelDefinition): void {
        this.log("\nGenerators:");
        const generators = modelDefinition.generators.getAll();
        generators.forEach(generator => this.safeExecute(() => this.logGenerator(generator), `Generator ID: ${generator?.id}`));
    }

    private logEntities(modelDefinition: ModelDefinition): void {
        this.log("\nEntities:");
        const entities = modelDefinition.entities.getAll();
        entities.forEach(entity => this.safeExecute(() => this.logEntity(entity), `Entity ID: ${entity?.id}`));
    }

    private safeExecute(action: () => void, context: string): void {
        try {
            action();
        } catch (error) {
            this.logError(`Failed to log ${context}:`, error);
        }
    }

    private logActivity(activity: Activity): void {
        this.log(`  Activity ID: ${activity.id}`);
        this.log(`    Name: ${activity.name}`);
        this.log(`    Capacity: ${activity.capacity}`);
        this.log(`    Inbound Queue Capacity: ${activity.inboundQueueCapacity}`);
        this.log(`    Outbound Queue Capacity: ${activity.outboundQueueCapacity}`);
        this.log(`    Number of Actions: ${activity.actions?.length || 0}`);

        activity.actions?.forEach((action, index) => {
            this.log(`      Action ${index + 1}:`);
            this.log(`        Type: ${action.actionType}`);
        });
    }

    private logConnector(connector: Connector): void {
        this.log(`  Connector ID: ${connector.id}`);
        this.log(`    Name: ${connector.name || "Unnamed"}`);
        this.log(`    Source ID: ${connector.sourceId || "Not defined"}`);
        this.log(`    Target ID: ${connector.targetId || "Not defined"}`);
        this.log(`    Weight: ${connector.weight !== undefined ? connector.weight : "Not defined"}`);

        this.log(`    Number of Actions: ${connector.actions?.length || 0}`);
        connector.actions?.forEach((action, index) => {
            this.log(`      Action ${index + 1}:`);
            this.log(`        Type: ${action.actionType}`);
        });
    }

    private logResource(resource: Resource): void {
        this.log(`  Resource ID: ${resource.id}`);
        this.log(`    Name: ${resource.name}`);
        this.log(`    Capacity: ${resource.capacity}`);
    }

    private logResourceRequirement(resourceRequirement: ResourceRequirement): void {
        this.log(`  Resource ID: ${resourceRequirement.id}`);
        this.log(`    Name: ${resourceRequirement.name}`);
        // this.log(`    Mode: ${resourceRequirement.mode}`);
    }

    private logGenerator(generator: Generator): void {
        this.log(`  Generator ID: ${generator.id}`);
        this.log(`    Name: ${generator.name || "Unnamed"}`);
        this.log(`    Exit Connector: ${generator.exitConnector || "Not defined"}`);
        this.log(`    Entity ID: ${generator.generationConfig?.entityId || "Not defined"}`);
        this.log(`    Periodic Occurrences: ${generator.generationConfig?.periodicOccurrences || "Not defined"}`);

        // const periodIntervalDuration = generator.generationConfig?.periodIntervalDuration?.durationLength;
        // this.log(`    Period Interval Duration: ${periodIntervalDuration !== undefined ? periodIntervalDuration : "Not defined"}`);

        this.log(`    Entities Per Creation: ${generator.generationConfig?.entitiesPerCreation || "Not defined"}`);

        // const periodicStartDuration = generator.generationConfig?.periodicStartDuration?.durationLength;
        // this.log(`    Periodic Start Duration: ${periodicStartDuration !== undefined ? periodicStartDuration : "Not defined"}`);

        this.log(`    Max Entities: ${generator.generationConfig?.maxEntities || "Not defined"}`);
    }

    private logEntity(entity: Entity): void {
        this.log(`  Entity ID: ${entity.id}`);
        this.log(`    Name: ${entity.name}`);
    }
}