import { ModelDefinition } from "./ModelDefinition";
import { Activity } from "./Activity";
import { Connector } from "./Connector";
import { Resource } from "./Resource";
import { Generator } from "./Generator";
import { Entity } from "./Entity";

export class ModelDefinitionLogger {
    static log(modelDefinition: ModelDefinition): void {
        console.log("\n[ModelDefinitionLogger] Logging Model Definition:");

        try {
            // Log basic model details
            console.log(`Model ID: ${modelDefinition.id}`);
            console.log(`Model Name: ${modelDefinition.name}`);

            this.logActivities(modelDefinition);
            this.logConnectors(modelDefinition);
            this.logResources(modelDefinition);
            this.logGenerators(modelDefinition);
            this.logEntities(modelDefinition);
        } catch (error) {
            console.error("[ModelDefinitionLogger] An error occurred while logging the model definition:", error);
        }
    }

    static logActivities(modelDefinition: ModelDefinition): void {
        console.log("\nActivities:");
        const activities = modelDefinition.activities.getAll();
        activities.forEach(activity => this.safeExecute(() => this.logActivity(activity), `Activity ID: ${activity?.id}`));
    }

    static logConnectors(modelDefinition: ModelDefinition): void {
        console.log("\nConnectors:");
        const connectors = modelDefinition.connectors.getAll();
        connectors.forEach(connector => this.safeExecute(() => this.logConnector(connector), `Connector ID: ${connector?.id}`));
    }

    static logResources(modelDefinition: ModelDefinition): void {
        console.log("\nResources:");
        const resources = modelDefinition.resources.getAll();
        resources.forEach(resource => this.safeExecute(() => this.logResource(resource), `Resource ID: ${resource?.id}`));
    }

    static logGenerators(modelDefinition: ModelDefinition): void {
        console.log("\nGenerators:");
        const generators = modelDefinition.generators.getAll();
        generators.forEach(generator => this.safeExecute(() => this.logGenerator(generator), `Generator ID: ${generator?.id}`));
    }

    static logEntities(modelDefinition: ModelDefinition): void {
        console.log("\nEntities:");
        const entities = modelDefinition.entities.getAll();
        entities.forEach(entity => this.safeExecute(() => this.logEntity(entity), `Entity ID: ${entity?.id}`));
    }

    private static safeExecute(action: () => void, context: string): void {
        try {
            action();
        } catch (error) {
            console.error(`[ModelDefinitionLogger] Failed to log ${context}:`, error);
        }
    }

    private static logActivity(activity: Activity): void {
        console.log(`  Activity ID: ${activity.id}`);
        console.log(`    Name: ${activity.name}`);
        console.log(`    Capacity: ${activity.capacity}`);
        console.log(`    Input Buffer Capacity: ${activity.inputBufferCapacity}`);
        console.log(`    Output Buffer Capacity: ${activity.outputBufferCapacity}`);
        console.log(`    Number of Operation Steps: ${activity.operationSteps?.length || 0}`);
        activity.operationSteps?.forEach((step, index) => {
            console.log(`      Operation Step ${index + 1}:`);
            console.log(`        Duration: ${step.duration?.durationLength || "Not defined"}`);
            if (step.resourceSetRequest?.requests) {
                console.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(request => {
                    if ('resource' in request && request.resource) {
                        console.log(`          Resource ID: ${request.resource.id}, Quantity: ${request.quantity || "Not defined"}`);
                    }
                });
            }
        });
    }

    private static logConnector(connector: Connector): void {
        console.log(`  Connector ID: ${connector.id}`);
        console.log(`    Name: ${connector.name || "Unnamed"}`);
        console.log(`    Source ID: ${connector.sourceId || "Not defined"}`);
        console.log(`    Target ID: ${connector.targetId || "Not defined"}`);
        console.log(`    Probability: ${connector.probability !== undefined ? connector.probability : "Not defined"}`);
        console.log(`    Connection Type: ${connector.connectType || "Not defined"}`);

        const operationSteps = connector.operationSteps;
        console.log(`    Number of Operation Steps: ${operationSteps?.length || 0}`);
        operationSteps?.forEach((step, index) => {
            console.log(`      Operation Step ${index + 1}:`);
            console.log(`        Duration: ${step.duration?.durationLength || "Not defined"}`);
            if (step.resourceSetRequest?.requests) {
                console.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(request => {
                    if ('resource' in request && request.resource) {
                        console.log(`          Resource ID: ${request.resource.id}, Quantity: ${request.quantity || "Not defined"}`);
                    }
                });
            }
        });
    }


    private static logResource(resource: Resource): void {
        console.log(`  Resource ID: ${resource.id}`);
        console.log(`    Name: ${resource.name}`);
        console.log(`    Capacity: ${resource.capacity}`);
    }

    private static logGenerator(generator: Generator): void {
        console.log(`  Generator ID: ${generator.id}`);
        console.log(`    Name: ${generator.name || "Unnamed"}`);
        console.log(`    Activity Key ID: ${generator.activityKeyId || "Not defined"}`);
        console.log(`    Entity ID: ${generator.entityId || "Not defined"}`);
        console.log(`    Periodic Occurrences: ${generator.periodicOccurrences || "Not defined"}`);

        const periodIntervalDuration = generator.periodIntervalDuration?.durationLength;
        console.log(`    Period Interval Duration: ${periodIntervalDuration !== undefined ? periodIntervalDuration : "Not defined"}`);

        console.log(`    Entities Per Creation: ${generator.entitiesPerCreation || "Not defined"}`);

        const periodicStartDuration = generator.periodicStartDuration?.durationLength;
        console.log(`    Periodic Start Duration: ${periodicStartDuration !== undefined ? periodicStartDuration : "Not defined"}`);

        console.log(`    Max Entities: ${generator.maxEntities || "Not defined"}`);
    }


    private static logEntity(entity: Entity): void {
        console.log(`  Entity ID: ${entity.id}`);
        console.log(`    Name: ${entity.name}`);
    }
}
