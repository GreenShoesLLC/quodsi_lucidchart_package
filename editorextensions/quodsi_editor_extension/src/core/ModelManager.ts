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
    ISerializedResourceRequirement,
    EnvelopeMessageType,
    ValidationSeverity,
    ValidationIssue
} from "@quodsi/shared";
import { StorageAdapter } from "./StorageAdapter";
import { BlockProxy, ElementProxy, PageProxy, EditorClient, LineProxy } from "lucid-extension-sdk";
import { ModelDefinitionPageBuilder } from "./ModelDefinitionPageBuilder";
import { ModelStructureBuilder } from "../services/accordion/ModelStructureBuilder";
import { LucidElementFactory } from "../services/LucidElementFactory";
import { ExtensionDebugService } from "./logging/ExtensionDebugService";
import { router } from "./messaging";


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

        if ((this.changeTracker.modelDefinitionDirty || !this.modelDefinition) && this.currentPage) {
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
        // Force rebuild from storage to pick up any deleted elements
        this.changeTracker.modelDefinitionDirty = true;
        const modelDef = await this.ensureModelDefinition();

        if (!modelDef) {
            this.currentValidationResult = {
                isValid: false,
                issues: [ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'no_model_initialized',
                    'No model initialized'
                )],
                summary: {
                    errorCount: 1,
                    warningCount: 0,
                    infoCount: 0
                }
            };
            this.broadcastValidationResults(this.currentValidationResult);
            return this.currentValidationResult;
        }

        const result = await this.validationService.validate(modelDef);

        // Result already has the correct structure with issues and summary
        this.currentValidationResult = result;

        this.changeTracker.validationDirty = false;
        this.changeTracker.lastValidationUpdate = Date.now();

        // Broadcast validation results to React UI
        this.broadcastValidationResults(this.currentValidationResult);

        return this.currentValidationResult;
    }

    /**
     * Broadcasts validation results to React UI panels
     */
    private broadcastValidationResults(result: ValidationResult): void {
        try {
            // Result already has the correct structure with issues and summary
            this.debug.log('Broadcasting validation results', {
                isValid: result.isValid,
                errorCount: result.summary.errorCount,
                warningCount: result.summary.warningCount,
                infoCount: result.summary.infoCount
            });

            // Send validation state changed message
            router.send('model', {
                id: `validation-${Date.now()}`,
                type: EnvelopeMessageType.MODEL_VALIDATION_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: {
                    isValid: result.isValid,
                    issues: result.issues,
                    summary: result.summary
                }
            });
        } catch (error) {
            this.debug.error('Error broadcasting validation results:', error);
        }
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
        try {
            // Determine metadata
            const actualMetadata = metadata || {
                id: element.id,
                version: this.storageAdapter.CURRENT_VERSION
            };

            // Call storage adapter
            this.storageAdapter.setElementData(element, data, type, actualMetadata);

            // Mark model as dirty
            this.markModelDirty(element.id);
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
        try {
            // Handle conversion to NONE type (removing simulation data)
            if (type === SimulationObjectType.None) {
                const existingElement = this.getElementById(element.id);
                if (existingElement) {
                    this.removeElement(element.id);
                }
                return;
            }

            // Handle type conversion with no data
            if (type && (!data || Object.keys(data).length === 0)) {
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
     * Clean up all references to a deleted time pattern
     */
    private async cleanupTimePatternReferences(patternId: string, page: PageProxy): Promise<void> {
        this.debug.log('Cleaning up references to time pattern:', patternId);

        // Get time distributed configs and remove any that reference this pattern
        const configs = this.storageAdapter.getTimeDistributedConfigs(page) || [];
        const updatedConfigs = configs.filter(c => c.timePatternId !== patternId);

        if (updatedConfigs.length < configs.length) {
            this.debug.log(`Removed ${configs.length - updatedConfigs.length} time distributed configs referencing pattern ${patternId}`);
            this.storageAdapter.setTimeDistributedConfigs(page, updatedConfigs);
        }

        // Process all generators to remove references to configs that were deleted
        const deletedConfigIds = configs
            .filter(c => c.timePatternId === patternId)
            .map(c => c.unique_id);

        if (deletedConfigIds.length > 0) {
            for (const [, block] of page.allBlocks) {
                const elementData = this.storageAdapter.getElementData<any>(block);

                if (elementData?.type === SimulationObjectType.Generator && elementData.timeDistributedConfigIds) {
                    const originalLength = elementData.timeDistributedConfigIds.length;
                    elementData.timeDistributedConfigIds = elementData.timeDistributedConfigIds.filter(
                        (id: string) => !deletedConfigIds.includes(id)
                    );

                    if (elementData.timeDistributedConfigIds.length < originalLength) {
                        this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Generator);
                        this.debug.log('Updated generator after time pattern cleanup:', block.id);
                    }
                }
            }
        }
    }

    /**
     * Clean up all references to a deleted time distributed config
     */
    private async cleanupTimeDistributedConfigReferences(configId: string, page: PageProxy): Promise<void> {
        this.debug.log('Cleaning up references to time distributed config:', configId);

        // Process all generators
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);

            if (elementData?.type === SimulationObjectType.Generator && elementData.timeDistributedConfigIds) {
                const originalLength = elementData.timeDistributedConfigIds.length;
                elementData.timeDistributedConfigIds = elementData.timeDistributedConfigIds.filter(
                    (id: string) => id !== configId
                );

                if (elementData.timeDistributedConfigIds.length < originalLength) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Generator);
                    this.debug.log('Updated generator after time distributed config cleanup:', block.id);
                }
            }
        }
    }

    /**
     * Clean up all references to a deleted state
     */
    private async cleanupStateReferences(stateId: string, page: PageProxy): Promise<void> {
        // Process all blocks (Generators)
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);

            // Process generators with initial state modifications
            if (elementData?.type === SimulationObjectType.Generator) {
                let modified = false;

                if (elementData.initialStateModifications) {
                    const filtered = elementData.initialStateModifications
                        .filter((mod: any) => mod.stateUniqueId !== stateId);

                    if (filtered.length !== elementData.initialStateModifications.length) {
                        elementData.initialStateModifications = filtered;
                        modified = true;
                    }
                }

                if (modified) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Generator);
                }
            }
        }
    }

    /**
     * Clean up all references to a deleted resource requirement
     */
    private async cleanupRequirementReferences(requirementId: string, page: PageProxy): Promise<void> {
        this.debug.log('Cleaning up references to requirement:', requirementId);

        // Process all activities - update actions that reference the deleted requirement
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);

            if (elementData?.type === SimulationObjectType.Activity && elementData.actions) {
                let modified = false;

                for (const action of elementData.actions) {
                    if (action.resourceRequirementId === requirementId) {
                        action.resourceRequirementId = null;
                        modified = true;
                    }
                }

                if (modified) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Activity);
                    this.debug.log('Updated activity after requirement cleanup:', block.id);
                }
            }
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
            // Get current states to detect deletions
            const currentStates = this.storageAdapter.getStates(page) || [];
            const newStateIds = new Set(states.map(s => s.id));

            // Find deleted states
            const deletedStates = currentStates.filter(s => !newStateIds.has(s.id));

            // Clean up references for each deleted state
            for (const deletedState of deletedStates) {
                this.debug.log('Detected deleted state, cleaning up references:', deletedState.id);
                await this.cleanupStateReferences(deletedState.id, page);
            }

            // Save states to page storage
            this.storageAdapter.setStates(page, states);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateStates - Complete with cascading cleanup', {
                deletedCount: deletedStates.length
            });
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
            // Get current requirements to detect deletions
            const currentReqs = this.storageAdapter.getResourceRequirements(page) || [];
            const newReqIds = new Set(requirements.map(r => r.id));

            // Find deleted requirements
            const deletedReqs = currentReqs.filter(r => !newReqIds.has(r.id));

            // Clean up references for each deleted requirement
            for (const deletedReq of deletedReqs) {
                this.debug.log('Detected deleted requirement, cleaning up references:', deletedReq.id);
                await this.cleanupRequirementReferences(deletedReq.id, page);
            }

            // Save resource requirements to page storage
            this.storageAdapter.setResourceRequirements(page, requirements);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateResourceRequirements - Complete with cascading cleanup', {
                deletedCount: deletedReqs.length
            });
        } catch (error) {
            this.debug.error('Error in updateResourceRequirements:', error);
            throw error;
        }
    }

    /**
     * Updates the time patterns array for the model
     */
    public async updateTimePatterns(patterns: any[], page: PageProxy): Promise<void> {
        this.debug.log('updateTimePatterns - Start', {
            patternsCount: patterns.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Get current patterns to detect deletions
            const currentPatterns = this.storageAdapter.getTimePatterns(page) || [];
            const newPatternIds = new Set(patterns.map(p => p.unique_id));

            // Find deleted patterns
            const deletedPatterns = currentPatterns.filter(p => !newPatternIds.has(p.unique_id));

            // Clean up references for each deleted pattern
            for (const deletedPattern of deletedPatterns) {
                this.debug.log('Detected deleted time pattern, cleaning up references:', deletedPattern.unique_id);
                await this.cleanupTimePatternReferences(deletedPattern.unique_id, page);
            }

            // Save time patterns to page storage
            this.storageAdapter.setTimePatterns(page, patterns);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateTimePatterns - Complete with cascading cleanup', {
                deletedCount: deletedPatterns.length
            });
        } catch (error) {
            this.debug.error('Error in updateTimePatterns:', error);
            throw error;
        }
    }

    /**
     * Updates the time distributed configs array for the model
     */
    public async updateTimeDistributedConfigs(configs: any[], page: PageProxy): Promise<void> {
        this.debug.log('updateTimeDistributedConfigs - Start', {
            configsCount: configs.length,
            pageId: page.id,
            pageTitle: page.getTitle()
        });

        try {
            // Get current configs to detect deletions
            const currentConfigs = this.storageAdapter.getTimeDistributedConfigs(page) || [];
            const newConfigIds = new Set(configs.map(c => c.unique_id));

            // Find deleted configs
            const deletedConfigs = currentConfigs.filter(c => !newConfigIds.has(c.unique_id));

            // Clean up references for each deleted config
            for (const deletedConfig of deletedConfigs) {
                this.debug.log('Detected deleted time distributed config, cleaning up references:', deletedConfig.unique_id);
                await this.cleanupTimeDistributedConfigReferences(deletedConfig.unique_id, page);
            }

            // Save time distributed configs to page storage
            this.storageAdapter.setTimeDistributedConfigs(page, configs);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateTimeDistributedConfigs - Complete with cascading cleanup', {
                deletedCount: deletedConfigs.length
            });
        } catch (error) {
            this.debug.error('Error in updateTimeDistributedConfigs:', error);
            throw error;
        }
    }

    /**
     * Handles converting an element to a new simulation type
     * Uses LucidElementFactory for proper element creation with all required fields
     */
    private async handleTypeConversion(
        element: ElementProxy,
        newType: SimulationObjectType,
        page: PageProxy
    ): Promise<void> {
        this.debug.log('handleTypeConversion - Start', {
            elementId: element.id,
            newType: newType,
            elementType: element.constructor.name
        });

        // Ensure model exists
        if (!this.getModel()) {
            const model = {
                id: page.id,
                name: page.getTitle() || 'New Model',
                type: SimulationObjectType.Model
            };
            await this.initializeModel(model as Model, page);
        }

        try {
            // Log element details for debugging
            this.debug.debug('Element details before conversion:', {
                elementId: element.id,
                elementConstructor: element.constructor.name,
                isLineProxy: element instanceof LineProxy,
                isBlockProxy: element instanceof BlockProxy,
                hasGetEndpoint1: 'getEndpoint1' in element,
                hasGetEndpoint2: 'getEndpoint2' in element
            });

            // Validate element type matches target type
            if (newType === SimulationObjectType.Connector && !(element instanceof LineProxy)) {
                throw new Error(`Cannot convert element ${element.id} to Connector: element is not a LineProxy (found ${element.constructor.name})`);
            }
            if (newType !== SimulationObjectType.Connector && !(element instanceof BlockProxy)) {
                throw new Error(`Cannot convert element ${element.id} to ${newType}: element is not a BlockProxy (found ${element.constructor.name})`);
            }

            // Use LucidElementFactory to create proper platform object
            const factory = new LucidElementFactory(this.storageAdapter);
            factory.setLogging(false);

            this.debug.debug('Creating platform object using factory');
            const platformObject = factory.createPlatformObject(
                element,
                newType,
                true // isConversion flag
            );

            // Get the simulation object
            const simObject = platformObject.getSimulationObject();

            this.debug.debug('Created simulation object:', {
                id: simObject.id,
                type: simObject.type,
                name: simObject.name
            });

            // For Connectors, calculate and set probability based on outgoing connections
            if (newType === SimulationObjectType.Connector && element instanceof LineProxy) {
                const weight = this.calculateConnectorProbability(element as LineProxy, page);
                (simObject as Connector).weight = weight;

                this.debug.debug('Set connector probability:', {
                    connectorId: simObject.id,
                    probability: weight
                });

                // Update storage with the probability
                platformObject.updateFromPlatform();
            }

            // Register with model manager
            this.debug.debug('Registering element with model manager');
            await this.registerElement(simObject, element);

            this.debug.log('handleTypeConversion - Completed successfully');

        } catch (error) {
            this.debug.error('handleTypeConversion - Error:', error);
            throw error;
        }
    }

    /**
     * Calculates connector probability based on outgoing connections from source
     * Probability = 1.0 / number of outgoing connections from source
     */
    private calculateConnectorProbability(line: LineProxy, page: PageProxy): number {
        try {
            const endpoint1 = line.getEndpoint1();
            if (!endpoint1?.connection) {
                this.debug.debug('No source connection, defaulting probability to 1.0');
                return 1.0;
            }

            const sourceId = endpoint1.connection.id;

            // Count outgoing connections from this source
            let outgoingCount = 0;
            for (const [, otherLine] of page.allLines) {
                const otherEndpoint1 = otherLine.getEndpoint1();
                if (otherEndpoint1?.connection?.id === sourceId) {
                    outgoingCount++;
                }
            }

            const probability = outgoingCount > 0 ? 1.0 / outgoingCount : 1.0;

            this.debug.debug('Calculated connector probability:', {
                sourceId,
                outgoingCount,
                probability
            });

            return probability;

        } catch (error) {
            this.debug.error('Error calculating connector probability:', error);
            return 1.0; // Default to 1.0 on error
        }
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