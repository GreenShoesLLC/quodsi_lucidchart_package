// shared/src/types/elements/ModelDefinitionLogger.ts
import { ModelDefinition } from "./ModelDefinition";
import { Activity } from "./Activity";
import { Connector } from "./Connector";
import { Resource } from "./Resource";
import { Generator } from "./Generator";
import { Entity } from "./Entity";
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";

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
        this.log(`    Input Buffer Capacity: ${activity.inputBufferCapacity}`);
        this.log(`    Output Buffer Capacity: ${activity.outputBufferCapacity}`);
        this.log(`    Number of Operation Steps: ${activity.operationSteps?.length || 0}`);
        activity.operationSteps?.forEach((step, index) => {
            this.log(`      Operation Step ${index + 1}:`);
            this.log(`        Duration: ${step.duration?.durationLength || "Not defined"}`);
            if (step.resourceSetRequest?.requests) {
                this.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(request => {
                    if ('resource' in request && request.resource) {
                        this.log(`          Resource ID: ${request.resource.id}, Quantity: ${request.quantity || "Not defined"}`);
                    }
                });
            }
        });
    }

    private logConnector(connector: Connector): void {
        this.log(`  Connector ID: ${connector.id}`);
        this.log(`    Name: ${connector.name || "Unnamed"}`);
        this.log(`    Source ID: ${connector.sourceId || "Not defined"}`);
        this.log(`    Target ID: ${connector.targetId || "Not defined"}`);
        this.log(`    Probability: ${connector.probability !== undefined ? connector.probability : "Not defined"}`);
        this.log(`    Connection Type: ${connector.connectType || "Not defined"}`);

        const operationSteps = connector.operationSteps;
        this.log(`    Number of Operation Steps: ${operationSteps?.length || 0}`);
        operationSteps?.forEach((step, index) => {
            this.log(`      Operation Step ${index + 1}:`);
            this.log(`        Duration: ${step.duration?.durationLength || "Not defined"}`);
            if (step.resourceSetRequest?.requests) {
                this.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(request => {
                    if ('resource' in request && request.resource) {
                        this.log(`          Resource ID: ${request.resource.id}, Quantity: ${request.quantity || "Not defined"}`);
                    }
                });
            }
        });
    }

    private logResource(resource: Resource): void {
        this.log(`  Resource ID: ${resource.id}`);
        this.log(`    Name: ${resource.name}`);
        this.log(`    Capacity: ${resource.capacity}`);
    }

    private logGenerator(generator: Generator): void {
        this.log(`  Generator ID: ${generator.id}`);
        this.log(`    Name: ${generator.name || "Unnamed"}`);
        this.log(`    Activity Key ID: ${generator.activityKeyId || "Not defined"}`);
        this.log(`    Entity ID: ${generator.entityId || "Not defined"}`);
        this.log(`    Periodic Occurrences: ${generator.periodicOccurrences || "Not defined"}`);

        const periodIntervalDuration = generator.periodIntervalDuration?.durationLength;
        this.log(`    Period Interval Duration: ${periodIntervalDuration !== undefined ? periodIntervalDuration : "Not defined"}`);

        this.log(`    Entities Per Creation: ${generator.entitiesPerCreation || "Not defined"}`);

        const periodicStartDuration = generator.periodicStartDuration?.durationLength;
        this.log(`    Periodic Start Duration: ${periodicStartDuration !== undefined ? periodicStartDuration : "Not defined"}`);

        this.log(`    Max Entities: ${generator.maxEntities || "Not defined"}`);
    }

    private logEntity(entity: Entity): void {
        this.log(`  Entity ID: ${entity.id}`);
        this.log(`    Name: ${entity.name}`);
    }
}