// shared/src/types/elements/ModelDefinitionLogger.ts
import { ModelDefinition } from "./ModelDefinition";
import { Activity } from "./Activity";
import { Connector } from "./Connector";
import { Resource } from "./Resource";
import { Generator } from "./Generator";
import { Entity } from "./Entity";
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";
import { ResourceRequirement } from "./ResourceRequirement";

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
        this.log(`    Input Buffer Capacity: ${activity.inputBufferCapacity}`);
        this.log(`    Output Buffer Capacity: ${activity.outputBufferCapacity}`);
        this.log(`    Number of Operation Steps: ${activity.operationSteps?.length || 0}`);

        activity.operationSteps?.forEach((step, index) => {
            this.log(`      Operation Step ${index + 1}:`);
            this.log(`        Duration: ${step.duration?.durationLength || "Not defined"}`);

            if (step.requirementId) {
                this.log(`        Resource Requirement ID: ${step.requirementId}`);
                this.log(`        Quantity: ${step.quantity}`);

                // If you need to log the actual resource requests, you'll need to pass
                // the ResourceRequirement data to this method or have a way to look it up

                /* Example if you had access to requirements:
                const requirement = this.getRequirement(step.requirementId);
                if (requirement) {
                    this.log(`        Requirement Mode: ${requirement.mode}`);
                    this.log("        Resource Requests:");
                    requirement.requests.forEach(request => {
                        this.log(`          Resource ID: ${request.resourceId}, ` + 
                                `Quantity: ${request.quantity}, ` +
                                `Priority: ${request.priority}, ` +
                                `Keep Resource: ${request.keepResource}`);
                    });
                }
                */
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
            if (step.requirementId) {
                this.log(`        Resource Requirement ID: ${step.requirementId}`);
                this.log(`        Quantity: ${step.quantity}`);
            }
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