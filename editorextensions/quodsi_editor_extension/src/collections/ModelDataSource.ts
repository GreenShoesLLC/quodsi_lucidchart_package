import { DataProxy, JsonSerializable } from "lucid-extension-sdk";
import { ModelSchema } from "./ModelSchema";
import { ActivitySchema } from "./ActivitySchema";
import { ResourceSchema } from "./ResourceSchema";
import { EntitySchema } from "./EntitySchema";
import { GeneratorSchema } from "./GeneratorSchema";
import { ConnectorSchema } from "./ConnectorSchema";
import { OperationStepSchema } from "./OperationStepSchema";
import { ResourceRequirementSchema } from "./ResourceRequirementSchema";
import { RequirementClauseSchema } from "./RequirementClauseSchema";
import { ResourceRequestSchema } from "./ResourceRequestSchema";
import { QuodsiLogger } from "@quodsi/shared";

export const MODEL_COLLECTIONS = {
    MODEL: "model",
    ACTIVITIES: "activities",
    RESOURCES: "resources",
    ENTITIES: "entities", 
    GENERATORS: "generators",
    CONNECTORS: "connectors",
    OPERATION_STEPS: "operationSteps",
    RESOURCE_REQUIREMENTS: "resourceRequirements",
    REQUIREMENT_CLAUSES: "requirementClauses",
    RESOURCE_REQUESTS: "resourceRequests"
} as const;

interface CollectionIds {
    [key: string]: string;
}

export class ModelDataSource extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[ModelDataSource]';
    private collectionIds: CollectionIds = {};

    constructor(private data: DataProxy) {
        super();
        this.setLogging(true);
    }

    createModelDataSource(modelId: string, config: { [key: string]: JsonSerializable } = {}) {
        this.log(`Creating data source for model ${modelId}`);
        const source = this.data.addDataSource(`model_${modelId}`, config);
        if (!source) {
            this.logError('Failed to create data source');
            return null;
        }

        try {
            this.log(`Adding ${MODEL_COLLECTIONS.MODEL} collection`);
            const modelCollection = source.addCollection(MODEL_COLLECTIONS.MODEL, ModelSchema);
            this.collectionIds[MODEL_COLLECTIONS.MODEL] = modelCollection?.id || '';
            this.log(`Model collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.MODEL]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.ACTIVITIES} collection`);
            const activitiesCollection = source.addCollection(MODEL_COLLECTIONS.ACTIVITIES, ActivitySchema);
            this.collectionIds[MODEL_COLLECTIONS.ACTIVITIES] = activitiesCollection?.id || '';
            this.log(`Activities collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.ACTIVITIES]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.RESOURCES} collection`);
            const resourcesCollection = source.addCollection(MODEL_COLLECTIONS.RESOURCES, ResourceSchema);
            this.collectionIds[MODEL_COLLECTIONS.RESOURCES] = resourcesCollection?.id || '';
            this.log(`Resources collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.RESOURCES]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.ENTITIES} collection`);
            const entitiesCollection = source.addCollection(MODEL_COLLECTIONS.ENTITIES, EntitySchema);
            this.collectionIds[MODEL_COLLECTIONS.ENTITIES] = entitiesCollection?.id || '';
            this.log(`Entities collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.ENTITIES]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.GENERATORS} collection`);
            const generatorsCollection = source.addCollection(MODEL_COLLECTIONS.GENERATORS, GeneratorSchema);
            this.collectionIds[MODEL_COLLECTIONS.GENERATORS] = generatorsCollection?.id || '';
            this.log(`Generators collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.GENERATORS]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.CONNECTORS} collection`);
            const connectorsCollection = source.addCollection(MODEL_COLLECTIONS.CONNECTORS, ConnectorSchema);
            this.collectionIds[MODEL_COLLECTIONS.CONNECTORS] = connectorsCollection?.id || '';
            this.log(`Connectors collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.CONNECTORS]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.OPERATION_STEPS} collection`);
            const operationStepsCollection = source.addCollection(MODEL_COLLECTIONS.OPERATION_STEPS, OperationStepSchema);
            this.collectionIds[MODEL_COLLECTIONS.OPERATION_STEPS] = operationStepsCollection?.id || '';
            this.log(`Operation steps collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.OPERATION_STEPS]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.RESOURCE_REQUIREMENTS} collection`);
            const resourceRequirementsCollection = source.addCollection(MODEL_COLLECTIONS.RESOURCE_REQUIREMENTS, ResourceRequirementSchema);
            this.collectionIds[MODEL_COLLECTIONS.RESOURCE_REQUIREMENTS] = resourceRequirementsCollection?.id || '';
            this.log(`Resource requirements collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.RESOURCE_REQUIREMENTS]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.REQUIREMENT_CLAUSES} collection`);
            const requirementClausesCollection = source.addCollection(MODEL_COLLECTIONS.REQUIREMENT_CLAUSES, RequirementClauseSchema);
            this.collectionIds[MODEL_COLLECTIONS.REQUIREMENT_CLAUSES] = requirementClausesCollection?.id || '';
            this.log(`Requirement clauses collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.REQUIREMENT_CLAUSES]}`);

            this.log(`Adding ${MODEL_COLLECTIONS.RESOURCE_REQUESTS} collection`);
            const resourceRequestsCollection = source.addCollection(MODEL_COLLECTIONS.RESOURCE_REQUESTS, ResourceRequestSchema);
            this.collectionIds[MODEL_COLLECTIONS.RESOURCE_REQUESTS] = resourceRequestsCollection?.id || '';
            this.log(`Resource requests collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.RESOURCE_REQUESTS]}`);

            this.log('Collection IDs:', this.collectionIds);

        } catch (error) {
            this.logError('Error creating collections:', error);
            return null;
        }

        return { source, collectionIds: this.collectionIds };
    }

    getModelDataSource(modelId: string) {
        this.log(`Getting data source for model ${modelId}`);
        const source = this.data.dataSources.get(`model_${modelId}`);
        this.log(`Data source found:`, !!source);
        return source;
    }

    getCollectionId(collectionName: string): string {
        return this.collectionIds[collectionName] || '';
    }
}