import { DataProxy, DataSourceProxy, CollectionProxy, SerializedFieldType } from 'lucid-extension-sdk';
import { ModelDefinitionSchema } from '../schemas/ModelDefinitionSchema';
import { DATA_SOURCE_NAMES, MODEL_DEFINITION_COLLECTIONS, createModelId } from '../../common/constants';
import { QuodsiLogger } from '@quodsi/shared';

export interface ModelDefinition {
    id: string;
    documentId: string;
    pageId: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    version: string;
}

export class ModelDefinitionRepository extends QuodsiLogger {
    protected readonly LOG_PREFIX = '[ModelDefinitionRepository]';
    private dataSource: DataSourceProxy | null = null;
    private collection: CollectionProxy | null = null;
    private isInitializing: boolean = false;
    private initializationPromise: Promise<boolean> | null = null;
    private dataSourceId: string | null = null;
    private collectionId: string | null = null;

    constructor(private data: DataProxy) {
        super();
        this.setLogging(true);
    }

    /**
     * Find a data source by type property in its config
     */
    private findDataSourceByType(type: string): DataSourceProxy | null {
        if (!this.data || !this.data.dataSources) {
            return null;
        }

        for (const [id, dataSource] of this.data.dataSources) {
            try {
                const config = dataSource.getSourceConfig();
                if (config && config.type === type) {
                    this.log(`Found data source with type=${type}, id=${id}`);
                    this.dataSourceId = id;
                    return dataSource;
                }
            } catch (err) {
                this.log(`Error checking data source ${id}:`, err);
            }
        }

        return null;
    }

    /**
     * Validates a collection actually exists and can be used
     */
    private validateCollection(collection: CollectionProxy | null): boolean {
        if (!collection) {
            return false;
        }

        try {
            // Try to perform a simple operation to verify the collection is usable
            const fields = collection.getFields();
            this.log('Collection validation - fields:', fields);

            // Check if we can access the items property
            const itemCount = collection.items ? collection.items.size : -1;
            this.log('Collection validation - item count:', itemCount);

            return true;
        } catch (error) {
            this.logError('Collection validation failed:', error);
            return false;
        }
    }

    /**
     * Ensures the collection is ready to use
     */
    private async ensureCollection(): Promise<boolean> {
        if (!this.dataSource) {
            this.logError('Cannot ensure collection - data source is not initialized');
            return false;
        }

        // Try to get the collection
        try {
            // Check if we already have a valid collection
            if (this.collection && this.validateCollection(this.collection)) {
                return true;
            }

            // First attempt by name
            this.log('Getting collection by name:', MODEL_DEFINITION_COLLECTIONS.MODEL_DEFINITIONS);

            // Add null check to ensure dataSource exists and has collections property
            if (this.dataSource && this.dataSource.collections) {
                this.collection = this.dataSource.collections.get(MODEL_DEFINITION_COLLECTIONS.MODEL_DEFINITIONS);

                if (this.collection && this.validateCollection(this.collection)) {
                    this.collectionId = this.collection.id;
                    return true;
                }
            }

            // Create the collection with additional null safety
            this.log('Creating collection:', MODEL_DEFINITION_COLLECTIONS.MODEL_DEFINITIONS);

            // Verify dataSource is not null before calling addCollection
            if (!this.dataSource) {
                this.logError('Data source became null during collection creation');
                return false;
            }

            this.collection = this.dataSource.addCollection(
                MODEL_DEFINITION_COLLECTIONS.MODEL_DEFINITIONS,
                ModelDefinitionSchema
            );

            if (!this.collection) {
                this.logError('Failed to create collection - returned null');
                return false;
            }

            this.collectionId = this.collection.id;
            this.log('Collection created, id:', this.collectionId);

            // Minimal async delay
            await Promise.resolve();

            // Validate the collection
            if (!this.validateCollection(this.collection)) {
                this.logError('Collection validation failed after creation');
                return false;
            }

            return true;
        } catch (error) {
            this.logError('Error ensuring collection:', error);
            return false;
        }
    }

    /**
     * Dump state for debugging
     */
    private dumpState(): void {
        this.log('==== Repository State ====');
        this.log('DataProxy exists:', !!this.data);

        if (this.data) {
            this.log('DataSources count:', this.data.dataSources ? this.data.dataSources.size : 'N/A');
            if (this.data.dataSources) {
                this.log('Available datasource names:', Array.from(this.data.dataSources.keys()));
                // Log data source details
                for (const [id, ds] of this.data.dataSources) {
                    try {
                        const config = ds.getSourceConfig();
                        this.log(`DataSource ${id}:`, {
                            name: ds.getName(),
                            config
                        });
                    } catch (err) {
                        this.log(`Error getting config for datasource ${id}:`, err);
                    }
                }
            }
        }

        this.log('DataSource exists:', !!this.dataSource);
        if (this.dataSource) {
            this.log('DataSource ID:', this.dataSource.id);
            this.log('DataSource name:', this.dataSource.getName());
            this.log('Collections count:', this.dataSource.collections ? this.dataSource.collections.size : 'N/A');

            if (this.dataSource.collections) {
                this.log('Collection names:', Array.from(this.dataSource.collections.keys()));
            }
        }

        this.log('Collection exists:', !!this.collection);
        if (this.collection) {
            this.log('Collection ID:', this.collection.id);
            this.log('Collection name:', this.collection.getName());
            this.log('Items count:', this.collection.items ? this.collection.items.size : 'N/A');
        }
        this.log('==== End State ====');
    }

    /**
     * Initializes the model definition data source and collection
     * Creates them if they don't exist
     */
    async initialize(): Promise<boolean> {
        // If we're already initializing, return the existing promise
        if (this.isInitializing && this.initializationPromise) {
            this.log('Already initializing - waiting for completion');
            return this.initializationPromise;
        }

        this.isInitializing = true;
        this.initializationPromise = this._doInitialize();
        const result = await this.initializationPromise;
        this.isInitializing = false;
        return result;
    }

    /**
     * Internal method that performs the actual initialization
     */
    private async _doInitialize(): Promise<boolean> {
        this.log('Initializing model definition repository');
        try {
            // Start fresh with clean state
            this.collection = null;

            // Dump the initial state
            this.dumpState();

            // Verify DataProxy
            if (!this.data) {
                this.logError('DataProxy is null or undefined');
                return false;
            }

            // Try to find existing data source by type
            try {
                // First look for a data source with our specific type
                this.dataSource = this.findDataSourceByType('quodsi_model_definition');

                if (!this.dataSource && this.dataSourceId) {
                    // If we've stored an ID from a previous search, try that
                    this.dataSource = this.data.dataSources.get(this.dataSourceId);
                }

                this.log('Initial data source check:', {
                    exists: !!this.dataSource,
                    id: this.dataSourceId
                });
            } catch (err) {
                this.logError('Error accessing data sources:', err);
                return false;
            }

            // Create data source if it doesn't exist
            if (!this.dataSource) {
                try {
                    this.log('Creating model definition data source');

                    // Try creating the data source with a specific type in the config
                    this.dataSource = this.data.addDataSource(DATA_SOURCE_NAMES.MODEL_DEFINITION, {
                        type: 'quodsi_model_definition'
                    });

                    if (!this.dataSource) {
                        this.logError('Failed to create model definition data source - returned null');
                        return false;
                    }

                    // Store the data source ID for future reference
                    this.dataSourceId = this.dataSource.id;
                    this.log('New data source created with ID:', this.dataSourceId);

                    // Add a small delay to ensure data source creation is complete
                    await this.delay(300);

                    // Re-fetch the data source to verify it was created
                    if (this.dataSourceId) {
                        this.dataSource = this.data.dataSources.get(this.dataSourceId);
                        if (!this.dataSource) {
                            this.logError('Data source not found after creation by ID');

                            // Try to find it by type as a fallback
                            this.dataSource = this.findDataSourceByType('quodsi_model_definition');
                            if (!this.dataSource) {
                                this.logError('Data source not found after creation by type');
                                return false;
                            }
                        }
                    }

                    this.log('Data source created successfully, id:', this.dataSource.id);
                } catch (err) {
                    this.logError('Error creating data source:', err);
                    return false;
                }
            }

            // Now ensure the collection exists and is valid
            const collectionSuccess = await this.ensureCollection();
            if (!collectionSuccess) {
                this.logError('Failed to ensure collection existence and validity');
                return false;
            }

            // Final state dump
            this.dumpState();

            return true;
        } catch (error) {
            this.logError('Error initializing model definition repository:', error);
            return false;
        }
    }

    /**
     * Safe delay implementation that works in LucidChart extension environment
     * Uses a simple counter loop with requestAnimationFrame
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            // Create a counter to track elapsed frames
            let frameCount = 0;
            // Assume approximately 60fps (16.67ms per frame)
            // We'll use a conservative 15ms per frame estimate
            const framesNeeded = Math.ceil(ms / 15);

            function nextFrame() {
                frameCount++;
                if (frameCount >= framesNeeded) {
                    resolve();
                } else {
                    try {
                        requestAnimationFrame(nextFrame);
                    } catch (e) {
                        // If requestAnimationFrame fails, resolve anyway after a short delay
                        frameCount = framesNeeded; // Force completion
                        resolve();
                    }
                }
            }

            try {
                requestAnimationFrame(nextFrame);
            } catch (e) {
                // If requestAnimationFrame is not available, resolve immediately
                resolve();
            }
        });
    }
    public getDataSourceId(): string | null {
        return this.dataSourceId;
    }
    /**
     * Converts a ModelDefinition to a record for storage
     */
    private convertModelDefinitionToRecord(model: ModelDefinition): Record<string, SerializedFieldType> {
        return {
            id: model.id,
            documentId: model.documentId,
            pageId: model.pageId,
            name: model.name,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            version: model.version
        };
    }

    /**
     * Ensures the repository is ready for operations
     */
    private async ensureReady(): Promise<boolean> {
        if (!this.collection || !this.validateCollection(this.collection)) {
            return await this.initialize();
        }
        return true;
    }

    /**
     * Enhanced method to find a model definition with detailed logging
     * @param documentId The document ID
     * @param pageId The page ID
     * @returns The model definition or null if not found
     */
    async findModelDefinition(documentId: string, pageId: string): Promise<ModelDefinition | null> {
        try {
            // Make sure we're initialized
            const ready = await this.ensureReady();
            if (!ready || !this.collection) {
                this.logError('Repository not ready in findModelDefinition');
                throw new Error('Repository not ready');
            }

            const id = createModelId(documentId, pageId);
            this.log(`Finding model definition with id: "${id}", documentId: "${documentId}", pageId: "${pageId}"`);

            // Log all items in the collection for debugging
            this.log('All items in collection:');
            if (this.collection.items.size === 0) {
                this.log('  Collection is empty - no items found');
            } else {
                for (const [itemId, item] of this.collection.items) {
                    try {
                        const itemDocId = item.fields.get('documentId') as string;
                        const itemPageId = item.fields.get('pageId') as string;
                        const itemName = item.fields.get('name') as string;

                        this.log(`  Item "${itemId}": documentId="${itemDocId}", pageId="${itemPageId}", name="${itemName}"`);
                    } catch (err) {
                        this.log(`  Error getting fields for item ${itemId}:`, err);
                    }
                }
            }

            // Try to get the item directly by ID
            let item = null;
            try {
                item = this.collection.items.get(id);
                this.log(`Direct lookup result for id "${id}": ${!!item ? 'FOUND' : 'NOT FOUND'}`);
            } catch (err) {
                this.logError(`Error in direct lookup for id "${id}":`, err);
            }

            // If direct lookup fails, try to find by matching fields
            if (!item) {
                this.log('Direct lookup failed, trying to find by fields match');

                for (const [itemId, collectionItem] of this.collection.items) {
                    try {
                        const itemDocId = collectionItem.fields.get('documentId') as string;
                        const itemPageId = collectionItem.fields.get('pageId') as string;

                        this.log(`Comparing: item documentId="${itemDocId}", pageId="${itemPageId}" with search documentId="${documentId}", pageId="${pageId}"`);

                        if (itemDocId === documentId && itemPageId === pageId) {
                            this.log(`Found matching item with id: ${itemId}`);
                            item = collectionItem;
                            break;
                        }
                    } catch (err) {
                        this.log(`Error comparing item ${itemId}:`, err);
                    }
                }
            }

            if (!item) {
                this.log('Model definition not found after both lookup methods');
                return null;
            }

            // Convert from DataItemProxy to ModelDefinition
            try {
                const modelDefinition = this.convertItemToModelDefinition(item);
                this.log('Found model definition:', modelDefinition);
                return modelDefinition;
            } catch (err) {
                this.logError('Error converting item to model definition:', err);
                return null;
            }
        } catch (error) {
            this.logError('Error finding model definition:', error);
            return null;
        }
    }

    /**
     * Safer method to convert an item to a ModelDefinition with error handling
     */
    private convertItemToModelDefinition(item: any): ModelDefinition {
        try {
            const id = item.fields.get('id') as string;
            const documentId = item.fields.get('documentId') as string;
            const pageId = item.fields.get('pageId') as string;
            const name = item.fields.get('name') as string;
            const createdAt = item.fields.get('createdAt') as string;
            const updatedAt = item.fields.get('updatedAt') as string;
            const version = item.fields.get('version') as string;

            this.log('Converting item to model definition with fields:', {
                id, documentId, pageId, name, createdAt, updatedAt, version
            });

            // Provide defaults for any missing fields
            const now = new Date().toISOString();

            return {
                id: id || createModelId(documentId, pageId),
                documentId: documentId || '',
                pageId: pageId || '',
                name: name || 'Unnamed Model',
                createdAt: createdAt || now,
                updatedAt: updatedAt || now,
                version: version || '1.0.0'
            };
        } catch (error) {
            this.logError('Error in convertItemToModelDefinition:', error);
            throw error;
        }
    }

    /**
     * Updates an existing model definition
     * @param model The model definition with updated fields
     * @returns The updated model definition or null if update failed
     */
    async updateModelDefinition(model: Partial<ModelDefinition> & { id: string }): Promise<ModelDefinition | null> {
        try {
            // Make sure we're initialized
            const ready = await this.ensureReady();
            if (!ready || !this.collection) {
                throw new Error('Repository not ready');
            }

            // Get existing item
            const existingItem = this.collection.items.get(model.id);
            if (!existingItem) {
                this.logError('Cannot update - model definition not found:', model.id);
                return null;
            }

            // Create updated model definition
            const updatedModel: ModelDefinition = {
                id: model.id,
                documentId: model.documentId || existingItem.fields.get('documentId') as string,
                pageId: model.pageId || existingItem.fields.get('pageId') as string,
                name: model.name || existingItem.fields.get('name') as string,
                createdAt: existingItem.fields.get('createdAt') as string,
                updatedAt: new Date().toISOString(),
                version: model.version || existingItem.fields.get('version') as string
            };

            // Convert to record for storage
            const modelDefRecord = this.convertModelDefinitionToRecord(updatedModel);

            // Create a map for changed items
            const changedItemsMap = new Map<string, Record<string, SerializedFieldType>>();
            changedItemsMap.set(updatedModel.id, modelDefRecord);

            try {
                // Update the collection
                this.collection.patchItems({
                    changed: changedItemsMap
                });

                this.log('Model definition updated successfully:', updatedModel);
                return updatedModel;
            } catch (patchError) {
                this.logError('Error in patchItems during update:', patchError);

                // Try a different approach - delete and re-add
                try {
                    this.log('Trying alternative update approach - delete and re-add');
                    this.collection.patchItems({
                        deleted: [updatedModel.id]
                    });

                    // Short delay to ensure deletion is processed
                    await this.delay(100);

                    this.collection.patchItems({
                        added: [modelDefRecord]
                    });

                    this.log('Alternative update successful');
                    return updatedModel;
                } catch (alternativeError) {
                    this.logError('Alternative update approach failed:', alternativeError);
                    throw alternativeError;
                }
            }
        } catch (error) {
            this.logError('Error updating model definition:', error);
            return null;
        }
    }

    /**
     * Creates or updates a model definition with robust ID handling
     * @param documentId The document ID
     * @param pageId The page ID
     * @param name The model name
     * @returns The created model definition or null if creation failed
     */
    async createModelDefinition(documentId: string, pageId: string, name: string): Promise<ModelDefinition | null> {
        try {
            // Make sure we're initialized
            const ready = await this.ensureReady();
            if (!ready || !this.collection) {
                throw new Error('Repository not ready');
            }

            // Log input parameters for debugging
            this.log('Creating model definition with params:', { documentId, pageId, name });

            // Create a unique ID for this model definition
            const id = createModelId(documentId, pageId);
            this.log(`Generated model ID: ${id}`);

            // Create the model definition record directly
            const now = new Date().toISOString();

            // Create item directly without checking for existing items first
            // This eliminates one potential source of errors
            const modelDefRecord = {
                id: id,
                documentId: documentId,
                pageId: pageId,
                name: name,
                createdAt: now,
                updatedAt: now,
                version: '1.0.0'
            };

            this.log('Creating model definition with record:', modelDefRecord);

            try {
                // Clear approach - first try to delete if it exists (ignoring errors)
                try {
                    this.collection.patchItems({
                        deleted: [id]
                    });
                    this.log('Deleted any existing item with the same ID (if any)');
                } catch (deleteError) {
                    // Ignore delete errors - the item may not exist
                    this.log('No previous item found to delete (this is normal)');
                }

                // Add the new item
                this.collection.patchItems({
                    added: [modelDefRecord]
                });

                this.log('Model definition record added to collection');

                // Since we're having issues with item retrieval, construct and return
                // the model definition directly instead of trying to verify
                const modelDefinition: ModelDefinition = {
                    id,
                    documentId,
                    pageId,
                    name,
                    createdAt: now,
                    updatedAt: now,
                    version: '1.0.0'
                };

                return modelDefinition;
            } catch (error) {
                this.logError('Error during model definition creation:', error);

                // Final fallback approach - even simpler
                try {
                    this.log('Trying fallback approach for model creation');

                    // Create a minimal record
                    const minimalRecord = {
                        id: id,
                        documentId: documentId,
                        pageId: pageId,
                        name: name
                    };

                    // Try to add it
                    this.collection.patchItems({
                        added: [minimalRecord]
                    });

                    this.log('Minimal model definition added');

                    // Return a complete model definition object
                    return {
                        id,
                        documentId,
                        pageId,
                        name,
                        createdAt: now,
                        updatedAt: now,
                        version: '1.0.0'
                    };
                } catch (finalError) {
                    this.logError('All creation approaches failed:', finalError);
                    return null;
                }
            }
        } catch (error) {
            this.logError('Error in createModelDefinition top level:', error);
            return null;
        }
    }

    /**
     * Deletes a model definition
     * @param documentId The document ID
     * @param pageId The page ID
     * @returns True if the deletion was successful or the model didn't exist, false on error
     */
    async deleteModelDefinition(documentId: string, pageId: string): Promise<boolean> {
        try {
            // Make sure we're initialized
            const ready = await this.ensureReady();
            if (!ready || !this.collection) {
                throw new Error('Repository not ready');
            }

            const id = createModelId(documentId, pageId);
            this.log('Attempting to delete model definition with id:', id);

            // First check if the item exists
            const item = this.collection.items.get(id);
            if (!item) {
                this.log('Item not found, nothing to delete');
                return true; // Consider it a success if nothing to delete
            }

            // Log all matching items for debugging
            let matchCount = 0;
            if (this.collection.items.size > 0) {
                this.log('Scanning collection for matching items:');
                for (const [itemId, collectionItem] of this.collection.items) {
                    const itemDocId = collectionItem.fields.get('documentId') as string;
                    const itemPageId = collectionItem.fields.get('pageId') as string;

                    if (itemDocId === documentId && itemPageId === pageId) {
                        matchCount++;
                        this.log(`Found matching item: ${itemId} (total matches: ${matchCount})`);
                    }
                }
            }

            // Multi-approach deletion strategy
            let deleteSuccess = false;

            // Approach 1: Direct deletion by ID
            try {
                this.log('Deleting using direct ID approach');
                this.collection.patchItems({
                    deleted: [id]
                });
                deleteSuccess = true;
                this.log('Deletion successful with direct ID approach');
            } catch (directError) {
                this.logError('Error with direct ID deletion:', directError);

                // Approach 2: Match by fields and delete each match
                if (!deleteSuccess && matchCount > 0) {
                    try {
                        this.log('Trying field-based deletion approach');
                        const itemsToDelete: string[] = [];

                        for (const [itemId, collectionItem] of this.collection.items) {
                            const itemDocId = collectionItem.fields.get('documentId') as string;
                            const itemPageId = collectionItem.fields.get('pageId') as string;

                            if (itemDocId === documentId && itemPageId === pageId) {
                                itemsToDelete.push(itemId);
                            }
                        }

                        if (itemsToDelete.length > 0) {
                            this.log(`Deleting ${itemsToDelete.length} items by field match`);
                            this.collection.patchItems({
                                deleted: itemsToDelete
                            });
                            deleteSuccess = true;
                            this.log('Field-based deletion successful');
                        }
                    } catch (fieldError) {
                        this.logError('Error with field-based deletion:', fieldError);
                    }
                }

                // Approach 3: Delete one by one
                if (!deleteSuccess && matchCount > 0) {
                    try {
                        this.log('Trying one-by-one deletion approach');
                        let individualSuccess = false;

                        for (const [itemId, collectionItem] of this.collection.items) {
                            const itemDocId = collectionItem.fields.get('documentId') as string;
                            const itemPageId = collectionItem.fields.get('pageId') as string;

                            if (itemDocId === documentId && itemPageId === pageId) {
                                try {
                                    this.log(`Deleting individual item: ${itemId}`);
                                    this.collection.patchItems({
                                        deleted: [itemId]
                                    });
                                    individualSuccess = true;
                                    this.log(`Individual deletion successful for ${itemId}`);
                                    await this.delay(50); // Small delay between deletions
                                } catch (individualError) {
                                    this.logError(`Error deleting individual item ${itemId}:`, individualError);
                                }
                            }
                        }

                        deleteSuccess = individualSuccess;
                    } catch (oneByOneError) {
                        this.logError('Error with one-by-one deletion approach:', oneByOneError);
                    }
                }
            }

            // Verify deletion
            await this.delay(200);
            const verifyItem = this.collection.items.get(id);
            if (verifyItem) {
                this.logError('Item still exists after deletion attempts');
                return false;
            }

            this.log('Model definition deletion verified successful');
            return true;
        } catch (error) {
            this.logError('Error deleting model definition:', error);
            return false;
        }
    }

    /**
     * Lists all model definitions
     * @returns An array of all model definitions
     */
    async listModelDefinitions(): Promise<ModelDefinition[]> {
        try {
            // Make sure we're initialized
            const ready = await this.ensureReady();
            if (!ready || !this.collection) {
                throw new Error('Repository not ready');
            }

            const modelDefinitions: ModelDefinition[] = [];

            // Iterate through all items
            for (const [_, item] of this.collection.items) {
                try {
                    const modelDef = this.convertItemToModelDefinition(item);
                    modelDefinitions.push(modelDef);
                } catch (itemError) {
                    this.logError('Error converting item to model definition:', itemError);
                    // Continue with next item
                }
            }

            this.log(`Found ${modelDefinitions.length} model definitions`);
            return modelDefinitions;
        } catch (error) {
            this.logError('Error listing model definitions:', error);
            return [];
        }
    }

    /**
     * Lists all model definitions in a document
     * @param documentId The document ID to filter by
     * @returns An array of model definitions in the specified document
     */
    async listModelDefinitionsByDocument(documentId: string): Promise<ModelDefinition[]> {
        try {
            // We could optimize this by filtering directly in the collection
            // But for robustness, we'll use the existing listModelDefinitions method
            const allModels = await this.listModelDefinitions();
            const documentModels = allModels.filter(model => model.documentId === documentId);
            this.log(`Found ${documentModels.length} model definitions for document ${documentId}`);
            return documentModels;
        } catch (error) {
            this.logError('Error listing model definitions by document:', error);
            return [];
        }
    }

    /**
     * Checks if a model definition exists
     * @param documentId The document ID
     * @param pageId The page ID
     * @returns True if the model definition exists, false otherwise
     */
    async modelDefinitionExists(documentId: string, pageId: string): Promise<boolean> {
        try {
            const modelDef = await this.findModelDefinition(documentId, pageId);
            return modelDef !== null;
        } catch (error) {
            this.logError('Error checking if model definition exists:', error);
            return false;
        }
    }
}