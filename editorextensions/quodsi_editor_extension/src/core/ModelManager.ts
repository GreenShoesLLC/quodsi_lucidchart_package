// import { ModelValidationService } from "@quodsi/shared/src/validation/ModelValidationService";
import {
    ModelValidationService,
    Activity,
    Connector,
    Generator,
    Entity,
    Model,
    ModelDefinition,
    Resource,
    SimulationObject,
    SimulationObjectType,
    ValidationResult,
    MetaData,
    ModelStructure,
    ModelElement,
    ModelDefinitionLogger,
    ActivityListManager,
    ResourceRequirement,
    ValidationMessages,
    ISerializedState,
    ISerializedResourceRequirement
} from "@quodsi/shared";
import { StorageAdapter } from "./StorageAdapter";
import { BlockProxy, ElementProxy, PageProxy, EditorClient } from "lucid-extension-sdk";
import { ModelDefinitionPageBuilder } from "./ModelDefinitionPageBuilder";
import { ModelStructureBuilder } from "../services/accordion/ModelStructureBuilder";
import { LucidElementFactory } from "../services/LucidElementFactory";
import { ExtensionDebugService } from "./logging/ExtensionDebugService";


interface ChangeTracker {
    modelDefinitionDirty: boolean;        // Tracks if we need to rebuild ModelDefinition
    validationDirty: boolean;             // Tracks if we need to revalidate
    lastModelDefinitionUpdate: number;     // Timestamp of last ModelDefinition rebuild
    lastValidationUpdate: number;          // Timestamp of last validation
    pendingChanges: Set<string>;          // IDs of elements with pending changes
}

export class ModelManager {
    private debug = ExtensionDebugService.forComponent('ModelManager');
    private modelDefinition: ModelDefinition | null = null;
    private storageAdapter: StorageAdapter;
    private currentPage: PageProxy | null = null;
    private validationService: ModelValidationService;
    private currentValidationResult: ValidationResult | null = null;

    // Singleton instance and client reference
    private static instance: ModelManager | null = null;
    private static editorClient: EditorClient | null = null;

    /**
     * Get the singleton instance of ModelManager
     * @returns ModelManager instance
     * @throws Error if not initialized
     */
    public static getInstance(): ModelManager {
        if (!ModelManager.instance) {
            throw new Error('ModelManager not initialized');
        }
        return ModelManager.instance;
    }

    /**
     * Get the EditorClient reference
     * @returns EditorClient instance
     * @throws Error if not initialized
     */
    public static getClient(): EditorClient {
        if (!ModelManager.editorClient) {
            throw new Error('EditorClient not initialized');
        }
        return ModelManager.editorClient;
    }

    /**
     * Initialize the ModelManager singleton with client and storage adapter
     * @param client EditorClient instance
     * @param storageAdapter StorageAdapter instance
     */
    public static initialize(client: EditorClient, storageAdapter: StorageAdapter): void {
        ModelManager.editorClient = client;
        ModelManager.instance = new ModelManager(storageAdapter);
        // Use a static debug instance for the static method
        const staticDebug = ExtensionDebugService.forComponent('ModelManager');
        staticDebug.log('Initialized singleton instance');
    }

    // Change tracking
    private changeTracker: ChangeTracker = {
        modelDefinitionDirty: false,
        validationDirty: false,
        lastModelDefinitionUpdate: 0,
        lastValidationUpdate: 0,
        pendingChanges: new Set<string>()
    };

    // Cache timeouts (in milliseconds)
    private static readonly VALIDATION_CACHE_TIMEOUT = 5000;      // 5 seconds
    private static readonly MODEL_DEF_CACHE_TIMEOUT = 10000;      // 10 seconds

    constructor(storageAdapter: StorageAdapter) {
        this.storageAdapter = storageAdapter;
        this.validationService = new ModelValidationService();
        this.debug.log('ModelManager instance created');
    }
    /**
     * Marks the model as needing rebuild and validation
     */
    private markModelDirty(elementId?: string): void {
        this.changeTracker.modelDefinitionDirty = true;
        this.changeTracker.validationDirty = true;
        if (elementId) {
            this.changeTracker.pendingChanges.add(elementId);
        }
    }

    /**
     * Checks if caches are still valid based on timeouts
     */
    private checkCacheTimeouts(): void {
        const now = Date.now();

        // Check ModelDefinition cache timeout
        if (now - this.changeTracker.lastModelDefinitionUpdate > ModelManager.MODEL_DEF_CACHE_TIMEOUT) {
            this.changeTracker.modelDefinitionDirty = true;
        }

        // Check validation cache timeout
        if (now - this.changeTracker.lastValidationUpdate > ModelManager.VALIDATION_CACHE_TIMEOUT) {
            this.changeTracker.validationDirty = true;
        }
    }

    /**
     * Gets the current ModelDefinition, rebuilding if necessary
     */
    private async ensureModelDefinition(): Promise<ModelDefinition | null> {
        this.checkCacheTimeouts();

        if (this.changeTracker.modelDefinitionDirty && this.currentPage) {
            this.debug.log('Rebuilding ModelDefinition due to pending changes:', {
                pendingChanges: Array.from(this.changeTracker.pendingChanges),
                changeCount: this.changeTracker.pendingChanges.size
            });

            const lucidElementFactory = new LucidElementFactory(this.storageAdapter)
            lucidElementFactory.setLogging(false);
            const builder = new ModelDefinitionPageBuilder(this.storageAdapter, lucidElementFactory);
            try {
                const newModelDefinition = builder.buildFromConvertedPage(this.currentPage);

                if (!newModelDefinition) {
                    throw new Error('Builder returned null ModelDefinition');
                }

                if (!(newModelDefinition instanceof ModelDefinition)) {
                    throw new Error(`Invalid ModelDefinition type: ${typeof newModelDefinition}`);
                }

                // Verify activities manager
                if (!newModelDefinition.activities) {
                    throw new Error('activities property is undefined');
                }
                if (!(newModelDefinition.activities instanceof ActivityListManager)) {
                    throw new Error(`activities is not an ActivityListManager: ${typeof newModelDefinition.activities}`);
                }
                if (typeof newModelDefinition.activities.add !== 'function') {
                    throw new Error(`activities.add is not a function: ${typeof newModelDefinition.activities.add}`);
                }
                // ModelDefinitionLogger.logModelDefinition(newModelDefinition)
                this.modelDefinition = newModelDefinition;
                this.changeTracker.modelDefinitionDirty = false;
                this.changeTracker.lastModelDefinitionUpdate = Date.now();
                this.changeTracker.pendingChanges.clear();

                return this.modelDefinition;

            } catch (error) {
                this.debug.error('Error ensuring ModelDefinition:', error);
                throw error;
            }
        }

        return this.modelDefinition;
    }

    /**
     * Initializes a new model definition with data from storage
     */
    public async initializeModel(modelData: Model, pageProxy: PageProxy): Promise<void> {
        this.currentPage = pageProxy;

        // Force a rebuild for initialization
        this.markModelDirty();
        await this.ensureModelDefinition();

        // Store the model data
        this.storageAdapter.setElementData(
            pageProxy,
            modelData,
            SimulationObjectType.Model
        );

        await this.validateModel();
    }

    /**
     * Registers a simulation element
     */
    public async registerElement(element: SimulationObject, elementProxy: ElementProxy): Promise<void> {
        if (element.type === SimulationObjectType.Model) {
            this.modelDefinition = new ModelDefinition(element as Model);
            this.markModelDirty();
            return;
        }

        const modelDef = await this.ensureModelDefinition();
        if (!modelDef) {
            throw new Error('Model not initialized');
        }

        // Get default name format
        const defaultName = `New ${element.type}`;

        // Register with appropriate list manager and update name if needed
        switch (element.type) {
            case SimulationObjectType.Activity:
                if (element.name === defaultName) {
                    element.name = modelDef.activities.getNextName();
                }
                modelDef.activities.add(element as Activity);
                break;
            case SimulationObjectType.Connector:
                if (element.name === defaultName) {
                    element.name = modelDef.connectors.getNextName();
                }
                modelDef.connectors.add(element as Connector);
                break;
            case SimulationObjectType.Generator:
                if (element.name === defaultName) {
                    element.name = modelDef.generators.getNextName();
                }
                modelDef.generators.add(element as Generator);
                break;
            case SimulationObjectType.Resource:
                if (element.name === defaultName) {
                    element.name = modelDef.resources.getNextName();
                }
                const resource = element as Resource
                modelDef.resources.add(resource);
                const requirement = ResourceRequirement.createForSingleResource(resource)
                modelDef.resourceRequirements.add(requirement)
                break;
            case SimulationObjectType.Entity:
                if (element.name === defaultName) {
                    element.name = modelDef.entities.getNextName();
                }
                modelDef.entities.add(element as Entity);
                break;
            default:
                throw new Error(`Unknown element type: ${element.type}`);
        }

        this.markModelDirty(element.id);
        await this.validateModelIfNeeded();
    }

    /**
     * Updates an existing element
     */
    public async updateElement(element: SimulationObject): Promise<void> {
        const modelDef = await this.ensureModelDefinition();
        if (!modelDef || !this.currentPage) {
            throw new Error('Model not initialized');
        }

        const elementProxy = this.findElementProxy(element.id);
        if (!elementProxy) {
            throw new Error(`No element found for ID: ${element.id}`);
        }

        // Update in appropriate list manager
        switch (element.type) {
            case SimulationObjectType.Activity:
                modelDef.activities.add(element as Activity);
                break;
            case SimulationObjectType.Connector:
                modelDef.connectors.add(element as Connector);
                break;
            case SimulationObjectType.Generator:
                modelDef.generators.add(element as Generator);
                break;
            case SimulationObjectType.Resource:
                const resource = element as Resource
                const requirement = ResourceRequirement.createForSingleResource(resource)
                modelDef.resources.add(resource);
                modelDef.resourceRequirements.add(requirement)
                break;
            case SimulationObjectType.Entity:
                modelDef.entities.add(element as Entity);
                break;
        }

        // Update storage
        this.storageAdapter.updateElementData(elementProxy, element);

        this.markModelDirty(element.id);
        await this.validateModelIfNeeded();
    }

    /**
     * Removes an element
     */
    public async removeElement(elementId: string): Promise<void> {
        const modelDef = await this.ensureModelDefinition();
        if (!modelDef || !this.currentPage) return;

        const elementProxy = this.findElementProxy(elementId);
        if (!elementProxy) {
            this.debug.warn('No element found for ID:', elementId);
            return;
        }

        // Remove from all list managers
        modelDef.activities.remove(elementId);
        modelDef.connectors.remove(elementId);
        modelDef.generators.remove(elementId);
        modelDef.resources.remove(elementId);
        modelDef.entities.remove(elementId);
        modelDef.resourceRequirements.remove(elementId);

        // Remove from storage
        this.storageAdapter.clearElementData(elementProxy);

        this.markModelDirty(elementId);
        await this.validateModelIfNeeded();
    }

    /**
     * Validates the model only if needed
     */
    private async validateModelIfNeeded(): Promise<ValidationResult | null> {
        this.checkCacheTimeouts();

        if (!this.changeTracker.validationDirty) {
            return this.currentValidationResult;
        }

        return await this.validateModel();
    }

    /**
     * Forces a model validation
     */
    public async validateModel(): Promise<ValidationResult> {
        const modelDef = await this.ensureModelDefinition();

        if (!modelDef) {
            this.currentValidationResult = {
                isValid: false,
                errorCount: 1,
                warningCount: 0,
                messages: [{
                    type: 'error',
                    message: 'No model initialized'
                }]
            };
            return this.currentValidationResult;
        }

        const result = await this.validationService.validate(modelDef);

        const errorCount = result.messages.filter(m => m.type === 'error').length;
        const warningCount = result.messages.filter(m => m.type === 'warning').length;

        this.currentValidationResult = {
            ...result,
            errorCount,
            warningCount
        };

        this.changeTracker.validationDirty = false;
        this.changeTracker.lastValidationUpdate = Date.now();

        return this.currentValidationResult;
    }

    // Other helper methods remain the same...
    private findElementProxy(elementId: string): ElementProxy | null {
        if (!this.currentPage) return null;
        return this.currentPage.allBlocks.get(elementId) ||
            this.currentPage.allLines.get(elementId);
    }

    public getModel(): Model | null {
        return this.modelDefinition?.model ?? null;
    }

    /**
     * Sets the current page for model definition building
     */
    public setCurrentPage(page: PageProxy): void {
        this.currentPage = page;
        // Mark model as dirty so it gets rebuilt with the new page context
        this.markModelDirty();
    }

    public async getModelDefinition(): Promise<ModelDefinition | null> {
        return await this.ensureModelDefinition();
    }

    public getCurrentValidation(): ValidationResult | null {
        return this.currentValidationResult;
    }
    /**
     * Gets an element by ID from any list manager
     */
    public getElementById(id: string): SimulationObject | undefined {
        if (!this.modelDefinition) return undefined;

        return this.modelDefinition.activities.get(id) ||
            this.modelDefinition.connectors.get(id) ||
            this.modelDefinition.generators.get(id) ||
            this.modelDefinition.resources.get(id) ||
            this.modelDefinition.resourceRequirements.get(id) ||
            this.modelDefinition.entities.get(id);
    }

    /**
     * Gets elements by type
     */
    public getElementsByType(type: SimulationObjectType): SimulationObject[] {
        if (!this.modelDefinition) return [];

        switch (type) {
            case SimulationObjectType.Activity:
                return this.modelDefinition.activities.getAll();
            case SimulationObjectType.Connector:
                return this.modelDefinition.connectors.getAll();
            case SimulationObjectType.Generator:
                return this.modelDefinition.generators.getAll();
            case SimulationObjectType.Resource:
                return this.modelDefinition.resources.getAll();
            case SimulationObjectType.ResourceRequirement:
                return this.modelDefinition.resourceRequirements.getAll();
            case SimulationObjectType.Entity:
                return this.modelDefinition.entities.getAll();
            default:
                return [];
        }
    }
    public clear(): void {
        if (this.modelDefinition && this.currentPage) {
            for (const [, block] of this.currentPage.allBlocks) {
                this.storageAdapter.clearElementData(block);
            }
            for (const [, line] of this.currentPage.allLines) {
                this.storageAdapter.clearElementData(line);
            }
        }

        this.modelDefinition = null;
        this.currentPage = null;
        this.currentValidationResult = null;

        // Reset change tracking
        this.changeTracker = {
            modelDefinitionDirty: false,
            validationDirty: false,
            lastModelDefinitionUpdate: 0,
            lastValidationUpdate: 0,
            pendingChanges: new Set<string>()
        };
    }
    public isQuodsiModel(page: PageProxy): boolean {
        return this.storageAdapter.isQuodsiModel(page);
    }

    public getElementData<T>(element: ElementProxy): T | null {
        return this.storageAdapter.getElementData<T>(element);
    }

    public getMetadata(element: ElementProxy): MetaData | null {
        return this.storageAdapter.getMetadata(element);
    }

    public setElementData(
        element: ElementProxy,
        data: any,
        type: SimulationObjectType,
        metadata?: { id: string; version: string }
    ): void {
        this.debug.log('setElementData - Start', {
            elementId: element.id,
            dataType: typeof data,
            simulationObjectType: SimulationObjectType[type]
        });

        try {
            // Log basic input details
            this.debug.debug('Input Data:', {
                dataKeys: data ? Object.keys(data) : 'No data',
                metadata: metadata
            });

            // Determine metadata
            const actualMetadata = metadata || {
                id: element.id,
                version: this.storageAdapter.CURRENT_VERSION
            };

            this.debug.debug('Metadata:', {
                id: actualMetadata.id,
                version: actualMetadata.version,
                isDefaultUsed: !metadata
            });

            // Call storage adapter
            this.storageAdapter.setElementData(element, data, type, actualMetadata);

            // Mark model as dirty
            this.debug.debug('Marking model dirty for element:', element.id);
            this.markModelDirty(element.id);

            this.debug.log('setElementData - Completed Successfully');
        } catch (error) {
            this.debug.error('setElementData - Error', {
                elementId: element.id,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    public clearElementData(element: ElementProxy): void {
        this.storageAdapter.clearElementData(element);
        this.markModelDirty(element.id);
    }
    public get CURRENT_VERSION(): string {
        return this.storageAdapter.CURRENT_VERSION;
    }
    /**
     * Removes the model from the specified page and clears manager state
     */
    public removeModelFromPage(page: PageProxy): void {
        if (!page) {
            throw new Error('No page provided for model removal');
        }

        try {
            this.storageAdapter.clearAllModelData(page)
            // Clear all internal state
            this.clear();
        } catch (error) {
            this.debug.error('Error removing model:', error);
            throw new Error(`Failed to remove model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    public getStorageAdapter(): StorageAdapter {
        return this.storageAdapter;
    }

    public isUnconvertedElement(element: ElementProxy): boolean {
        return this.getElementData(element) === null;
    }

    /**
     * Handles saving simulation element data and metadata
     */
    public async saveElementData(
        element: ElementProxy,
        data: any,
        type: SimulationObjectType,
        page: PageProxy
    ): Promise<void> {
        this.debug.log('saveElementData - Start', {
            elementId: element.id,
            elementType: element.constructor.name,
            simulationObjectType: type,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Handle conversion to NONE type (removing simulation data)
            if (type === SimulationObjectType.None) {
                this.debug.log('Detected NONE type - removing element');
                const existingElement = this.getElementById(element.id);
                if (existingElement) {
                    this.debug.log('Removing element:', element.id);
                    this.removeElement(element.id);
                }
                return;
            }

            // Log data details for type conversion or update
            this.debug.debug('Incoming Data:', {
                type: typeof data,
                keys: data ? Object.keys(data) : 'No data',
                data: data ? JSON.parse(JSON.stringify(data)) : null
            });

            // Handle type conversion with no data
            if (type && (!data || Object.keys(data).length === 0)) {
                this.debug.log('Detected type conversion with no data');
                await this.handleTypeConversion(element, type, page);
                return;
            }

            // Handle regular data update
            await this.handleDataUpdate(element, data, type, page);
        } catch (error) {
            this.debug.error('Error in saveElementData:', error);
            throw error;
        }
    }

    /**
     * Updates the states array for the model
     */
    public async updateStates(states: ISerializedState[], page: PageProxy): Promise<void> {
        this.debug.log('updateStates - Start', {
            statesCount: states.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Save states to page storage
            this.storageAdapter.setStates(page, states);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateStates - Complete');
        } catch (error) {
            this.debug.error('Error in updateStates:', error);
            throw error;
        }
    }

    /**
     * Updates the resource requirements array for the model
     */
    public async updateResourceRequirements(requirements: ISerializedResourceRequirement[], page: PageProxy): Promise<void> {
        this.debug.log('updateResourceRequirements - Start', {
            requirementsCount: requirements.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Save resource requirements to page storage
            this.storageAdapter.setResourceRequirements(page, requirements);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateResourceRequirements - Complete');
        } catch (error) {
            this.debug.error('Error in updateResourceRequirements:', error);
            throw error;
        }
    }

    /**
     * Handles converting an element to a new simulation type
     */
    private async handleTypeConversion(
        element: ElementProxy,
        newType: SimulationObjectType,
        page: PageProxy
    ): Promise<void> {
        // Ensure model exists
        if (!this.getModel()) {
            const model = {
                id: page.id,
                name: page.getTitle() || 'New Model',
                type: SimulationObjectType.Model
            };
            await this.initializeModel(model as Model, page);
        }

        // Create initial data
        const elementName = this.getDefaultElementName(element);
        const convertedData = {
            id: element.id,
            type: newType,
            name: elementName
        };

        // Register and save
        this.registerElement(convertedData, element);
        this.setElementData(
            element,
            convertedData,
            newType,
            {
                id: element.id,
                version: this.CURRENT_VERSION
            }
        );
    }

    /**
     * Handles updating element data
     */
    private async handleDataUpdate(
        element: ElementProxy,
        updateData: any,
        type: SimulationObjectType,
        page: PageProxy
    ): Promise<void> {
        this.debug.log('handleDataUpdate - Start', {
            elementId: element.id,
            updateDataType: typeof updateData,
            simulationObjectType: type,
            pageId: page.id
        });

        try {
            // Check and log model existence
            const existingModel = this.getModel();
            if (!existingModel) {
                this.debug.log('No existing model found. Creating new model.');
                const model = {
                    id: page.id,
                    name: page.getTitle() || 'New Model',
                    type: SimulationObjectType.Model
                };
                this.debug.log('Initializing new model:', model);
                await this.initializeModel(model as Model, page);
            } else {
                this.debug.debug('Existing model found:', {
                    modelId: existingModel.id,
                    modelName: existingModel.name
                });
            }

            // Determine element name
            const elementName = this.getDefaultElementName(element);
            this.debug.debug('Element name determination:', {
                defaultElementName: elementName,
                updateDataContainsName: updateData && typeof updateData === 'object' && !Array.isArray(updateData) && 'name' in updateData
            });

            // Prepare element data
            const elementData = {
                id: element.id,
                type: type,
                ...updateData,
                name: (updateData && typeof updateData === 'object' && !Array.isArray(updateData) && 'name' in updateData)
                    ? (updateData as { name?: string }).name || elementName
                    : elementName
            };

            this.debug.debug('Prepared Element Data:', {
                id: elementData.id,
                type: elementData.type,
                name: elementData.name,
                additionalKeys: Object.keys(elementData).filter(k => !['id', 'type', 'name'].includes(k))
            });

            // Register and save
            this.debug.debug('Registering element');
            this.registerElement(elementData, element);

            this.debug.debug('Setting element data', {
                metadata: {
                    id: element.id,
                    version: this.CURRENT_VERSION
                }
            });
            this.setElementData(
                element,
                elementData,
                type,
                {
                    id: element.id,
                    version: this.CURRENT_VERSION
                }
            );

            this.debug.log('handleDataUpdate - Completed Successfully');
        } catch (error) {
            this.debug.error('Error in handleDataUpdate:', error);
            throw error;
        }
    }

    /**
     * Gets default name for an element based on its type
     */
    private getDefaultElementName(element: ElementProxy): string {
        if (element instanceof BlockProxy) {
            // Check for text areas on the block
            if (element.textAreas && element.textAreas.size > 0) {
                for (const text of element.textAreas.values()) {
                    if (text && text.trim()) {
                        return text.trim();
                    }
                }
            }
            // If no text found, use class name
            const className = element.getClassName() || 'Block';
            return `Block ${className}`;
        }
        return 'Unnamed Connector';
    }

    public async getModelStructure(): Promise<ModelStructure | undefined> {
        const modelDef = await this.getModelDefinition();
        if (modelDef) {
            return ModelStructureBuilder.buildModelStructure(modelDef);
        }
        return undefined;
    }
}