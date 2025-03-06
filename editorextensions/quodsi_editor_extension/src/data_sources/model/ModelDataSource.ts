import { DataProxy, JsonSerializable } from "lucid-extension-sdk";
import { QuodsiLogger } from "@quodsi/shared";
import { ModelDefinition, ModelDefinitionRepository } from "./repositories";
import { DATA_SOURCE_NAMES } from "../common/constants";

// Keep the original MODEL_COLLECTIONS for backward compatibility
// These will be used in the future when we implement the full data model
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

/**
 * ModelDataSource is the main entry point for working with model data
 * It serves as a facade for the various model repositories
 */
export class ModelDataSource extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[ModelDataSource]';

    // Repositories
    private modelDefinitionRepository: ModelDefinitionRepository;
    private initialized: boolean = false;

    constructor(private data: DataProxy) {
        super();
        this.setLogging(true);

        // Initialize repositories
        this.modelDefinitionRepository = new ModelDefinitionRepository(data);
    }

    /**
     * Initialize the ModelDataSource and all its repositories
     */
    async initialize(): Promise<boolean> {
        this.log('Initializing ModelDataSource');

        if (this.initialized) {
            this.log('ModelDataSource already initialized');
            return true;
        }

        try {
            // Initialize the model definition repository
            const modelDefInitResult = await this.modelDefinitionRepository.initialize();
            if (!modelDefInitResult) {
                this.logError('Failed to initialize model definition repository');
                return false;
            }

            this.initialized = true;
            this.log('ModelDataSource initialized successfully');
            return true;
        } catch (error) {
            this.logError('Error initializing ModelDataSource:', error);
            return false;
        }
    }

    /**
     * Ensure the ModelDataSource is initialized before performing operations
     */
    private async ensureInitialized(): Promise<boolean> {
        if (!this.initialized) {
            return await this.initialize();
        }
        return true;
    }

    /**
     * Get the model definition repository
     */
    getModelDefinitionRepository(): ModelDefinitionRepository {
        return this.modelDefinitionRepository;
    }

    /**
     * Create a model definition
     * @param documentId The document ID
     * @param pageId The page ID
     * @param name The model name
     * @returns The created model definition or null if creation failed
     */
    async createModelDefinition(documentId: string, pageId: string, name: string): Promise<ModelDefinition | null> {
        this.log(`Creating model definition: documentId=${documentId}, pageId=${pageId}, name=${name}`);

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            const result = await this.modelDefinitionRepository.createModelDefinition(documentId, pageId, name);

            if (!result) {
                this.logError('Failed to create model definition');
                return null;
            }

            this.log('Model definition created successfully:', result);
            return result;
        } catch (error) {
            this.logError('Error creating model definition:', error);
            return null;
        }
    }

    /**
     * Find a model definition
     * @param documentId The document ID
     * @param pageId The page ID
     * @returns The model definition or null if not found
     */
    async findModelDefinition(documentId: string, pageId: string): Promise<ModelDefinition | null> {
        this.log(`Finding model definition: documentId=${documentId}, pageId=${pageId}`);

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            const result = await this.modelDefinitionRepository.findModelDefinition(documentId, pageId);

            if (!result) {
                this.log('Model definition not found');
                return null;
            }

            this.log('Model definition found:', result);
            return result;
        } catch (error) {
            this.logError('Error finding model definition:', error);
            return null;
        }
    }

    /**
     * Update a model definition
     * @param model The model definition with updated fields
     * @returns The updated model definition or null if update failed
     */
    async updateModelDefinition(model: Partial<ModelDefinition> & { id: string }): Promise<ModelDefinition | null> {
        this.log(`Updating model definition: id=${model.id}`);

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            const result = await this.modelDefinitionRepository.updateModelDefinition(model);

            if (!result) {
                this.logError('Failed to update model definition');
                return null;
            }

            this.log('Model definition updated successfully:', result);
            return result;
        } catch (error) {
            this.logError('Error updating model definition:', error);
            return null;
        }
    }

    /**
     * Delete a model definition
     * @param documentId The document ID
     * @param pageId The page ID
     * @returns True if deletion was successful, false otherwise
     */
    async deleteModelDefinition(documentId: string, pageId: string): Promise<boolean> {
        this.log(`Deleting model definition: documentId=${documentId}, pageId=${pageId}`);

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            // First check if the model definition exists
            const modelDef = await this.findModelDefinition(documentId, pageId);
            if (!modelDef) {
                this.log('Model definition not found, nothing to delete');
                return true; // Return true as the end state is as expected (no model definition)
            }

            const result = await this.modelDefinitionRepository.deleteModelDefinition(documentId, pageId);

            if (!result) {
                this.logError('Failed to delete model definition');

                // Instead of setTimeout, use our safe delay
                // Use the repository's delay method by calling it directly
                await this.modelDefinitionRepository['delay'](500);

                const retryResult = await this.modelDefinitionRepository.deleteModelDefinition(documentId, pageId);

                if (!retryResult) {
                    this.logError('Retry deletion failed');
                    return false;
                }

                this.log('Model definition deleted successfully on retry');
                return true;
            }

            this.log('Model definition deleted successfully');
            return true;
        } catch (error) {
            this.logError('Error deleting model definition:', error);
            return false;
        }
    }
    /**
     * List all model definitions
     * @returns An array of model definitions
     */
    async listModelDefinitions(): Promise<ModelDefinition[]> {
        this.log('Listing all model definitions');

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            const result = await this.modelDefinitionRepository.listModelDefinitions();
            this.log(`Found ${result.length} model definitions`);
            return result;
        } catch (error) {
            this.logError('Error listing model definitions:', error);
            return [];
        }
    }

    /**
     * List all model definitions in a document
     * @param documentId The document ID
     * @returns An array of model definitions in the specified document
     */
    async listModelDefinitionsByDocument(documentId: string): Promise<ModelDefinition[]> {
        this.log(`Listing model definitions for document: ${documentId}`);

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            const result = await this.modelDefinitionRepository.listModelDefinitionsByDocument(documentId);
            this.log(`Found ${result.length} model definitions for document ${documentId}`);
            return result;
        } catch (error) {
            this.logError(`Error listing model definitions for document ${documentId}:`, error);
            return [];
        }
    }

    /**
     * Check if a model definition exists
     * @param documentId The document ID
     * @param pageId The page ID
     * @returns True if the model definition exists, false otherwise
     */
    async hasModelDefinition(documentId: string, pageId: string): Promise<boolean> {
        this.log(`Checking if model definition exists: documentId=${documentId}, pageId=${pageId}`);

        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('ModelDataSource not initialized');
            }

            const result = await this.findModelDefinition(documentId, pageId);
            const exists = !!result;

            this.log(`Model definition exists: ${exists}`);
            return exists;
        } catch (error) {
            this.logError('Error checking if model definition exists:', error);
            return false;
        }
    }

    /**
     * Get the data source for a model
     * This is kept for backward compatibility
     */
    getModelDataSource(modelId: string) {
        this.log(`Getting data source for model ${modelId} (deprecated)`);
        const source = this.data.dataSources.get(`model_${modelId}`);
        this.log(`Data source found:`, !!source);
        return source;
    }

    /**
     * Legacy method to create model data source - preserved but not used
     * This will be refactored in the future to use the new repository pattern
     */
    createModelDataSource(modelId: string, config: { [key: string]: JsonSerializable } = {}) {
        this.logError(`createModelDataSource is deprecated and will be removed in a future version`);

        this.log(`Creating data source for model ${modelId}`);
        const source = this.data.addDataSource(`model_${modelId}`, config);
        if (!source) {
            this.logError('Failed to create data source');
            return null;
        }

        try {
            // Legacy code preserved for reference
            // This actually creates all the collections but we won't use them yet
            /* 
            this.log(`Adding ${MODEL_COLLECTIONS.MODEL} collection`);
            const modelCollection = source.addCollection(MODEL_COLLECTIONS.MODEL, ModelSchema);
            this.collectionIds[MODEL_COLLECTIONS.MODEL] = modelCollection?.id || '';
            this.log(`Model collection created with ID: ${this.collectionIds[MODEL_COLLECTIONS.MODEL]}`);

            // Additional collections...
            */

            return { source };
        } catch (error) {
            this.logError('Error creating collections:', error);
            return null;
        }
    }
}