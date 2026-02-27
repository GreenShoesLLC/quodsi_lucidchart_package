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
    ElementTypeInfo,
    ModelStructure,
    ModelElement,
    ModelDefinitionLogger,
    ActivityListManager,
    ResourceRequirement,
    ValidationMessages,
    ISerializedState,
    ISerializedResourceRequirement,
    ISerializedScenario,
    EnvelopeMessageType,
    ValidationSeverity,
    ValidationIssue,
    ensureBaselineScenario,
    compareVersions
} from "@quodsi/shared";
import { StorageAdapter } from "./StorageAdapter";
import { BlockProxy, ElementProxy, PageProxy, EditorClient, LineProxy, DocumentProxy } from "lucid-extension-sdk";
import { ModelDefinitionPageBuilder } from "./ModelDefinitionPageBuilder";
import { ModelStructureBuilder } from "../services/accordion/ModelStructureBuilder";
import { LucidElementFactory } from "../services/LucidElementFactory";
import { ExtensionDebugService } from "./logging/ExtensionDebugService";
import { router } from "./messaging";
import { LucidVersionManager } from "../versioning/LucidVersionManager";
import { LucidDataActionUtility } from "../utils/LucidDataActionUtility";


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
    private versionManager: LucidVersionManager;
    private versionCheckedPageId: string | null = null;

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
        this.versionManager = new LucidVersionManager();
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
            // Check version once per page — upgrade storage data before rebuilding
            if (this.versionCheckedPageId !== this.currentPage.id) {
                if (this.storageAdapter.isQuodsiModel(this.currentPage)) {
                    let upgradeResult = { upgraded: false, sourceVersion: '', targetVersion: '' };
                    try {
                        upgradeResult = await this.versionManager.handlePageLoad(this.currentPage);
                    } catch (error) {
                        this.debug.error('Version check failed:', error);
                    }
                    // Ensure a Baseline scenario exists for this model page
                    this.ensureBaselineScenario(this.currentPage);

                    // One-time scenario adoption for documents upgrading from < 2026.02.23.
                    // Prior to 2026.02.23, q_scenarios didn't exist. Old simulation runs
                    // in Azure blob storage are adopted as scenario definitions.
                    if (upgradeResult.upgraded &&
                        compareVersions(upgradeResult.sourceVersion, '2026.02.23') < 0) {
                        this.adoptLegacySimulationRuns(this.currentPage).catch(error => {
                            this.debug.error('Scenario adoption failed (runs still in Azure, not lost):', error);
                        });
                    }
                }
                this.versionCheckedPageId = this.currentPage.id;
            }

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
     * Removes an element.
     *
     * For Resources: Cascading cleanup removes associated ResourceRequirements,
     * which then cascades to clean up actions (SEIZE/RELEASE deleted, DELAY_WITH_RESOURCE nullified).
     *
     * For Entities: Cascading cleanup clears entity references in Generators,
     * Activities (sourceConfig), and CreateActions (entityTemplateId).
     */
    public async removeElement(elementId: string): Promise<void> {
        const modelDef = await this.ensureModelDefinition();
        if (!modelDef || !this.currentPage) return;

        const elementProxy = this.findElementProxy(elementId);
        if (!elementProxy) {
            this.debug.warn('No element found for ID:', elementId);
            return;
        }

        // Check if this is a Resource - if so, perform cascading cleanup
        const existingResource = modelDef.resources.get(elementId);
        if (existingResource) {
            this.debug.log('Resource deletion detected, performing cascading cleanup:', elementId);

            // Step 1: Clean up ResourceRequirements that reference this resource
            const deletedReqIds = await this.cleanupResourceReferences(elementId, this.currentPage);

            // Step 2: For each deleted requirement, clean up action references
            for (const reqId of deletedReqIds) {
                const affectedCount = await this.cleanupRequirementReferences(reqId, this.currentPage);
                this.debug.log('Cleaned up actions for requirement:', { reqId, affectedCount });
            }

            // Also remove the auto-generated requirement from the model definition
            modelDef.resourceRequirements.remove(elementId);
        }

        // Check if this is an Entity - if so, perform cascading cleanup
        const existingEntity = modelDef.entities.get(elementId);
        if (existingEntity) {
            this.debug.log('Entity deletion detected, performing cascading cleanup:', elementId);
            const affectedCount = await this.cleanupEntityReferences(elementId, this.currentPage);
            this.debug.log('Cleaned up entity references:', { affectedCount });
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

    public getElementType(element: ElementProxy): ElementTypeInfo | null {
        return this.storageAdapter.getElementType(element);
    }

    public setElementData(
        element: ElementProxy,
        data: any,
        type: SimulationObjectType,
        options?: { mappingSource?: import('@quodsi/shared').MappingSource }
    ): void {
        try {
            // Call storage adapter
            this.storageAdapter.setElementData(element, data, type, options);

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
                if (!elementData) continue;

                // Get element type from q_data
                const typeInfo = this.storageAdapter.getElementType(block);
                const elementType = typeInfo?.type;

                if (elementType === SimulationObjectType.Generator && elementData.timeDistributedConfigIds) {
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
            if (!elementData) continue;

            // Get element type from q_data
            const typeInfo = this.storageAdapter.getElementType(block);
            const elementType = typeInfo?.type;

            if (elementType === SimulationObjectType.Generator && elementData.timeDistributedConfigIds) {
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
     * Helper method to clean state references from an actions array.
     * Handles all action types that can contain state references.
     *
     * @param actions Array of actions to clean
     * @param deletedStateId ID of the deleted state (for StateModification.stateUniqueId)
     * @param deletedStateName Name of the deleted state (for string references like inheritStates)
     * @returns Object with cleaned actions array and whether any modifications were made
     */
    private cleanActionsStateReferences(
        actions: any[],
        deletedStateId: string,
        deletedStateName: string
    ): { actions: any[]; modified: boolean } {
        let modified = false;

        for (const action of actions) {
            if (!action || !action.actionType) continue;

            // Handle modifications array (ASSIGN, SPLIT, CREATE, JOIN actions)
            if (action.modifications && Array.isArray(action.modifications)) {
                const originalLength = action.modifications.length;
                action.modifications = action.modifications.filter(
                    (mod: any) => mod.stateUniqueId !== deletedStateId
                );
                if (action.modifications.length !== originalLength) {
                    modified = true;
                }
            }

            // Handle stateModifications in DELAY_WITH_RESOURCE action
            if (action.actionType === 'DELAY_WITH_RESOURCE' && action.stateModifications) {
                const originalLength = action.stateModifications.length;
                action.stateModifications = action.stateModifications.filter(
                    (mod: any) => mod.stateUniqueId !== deletedStateId
                );
                if (action.stateModifications.length !== originalLength) {
                    modified = true;
                }
            }

            // Handle inheritStates array (SPLIT, CREATE, JOIN actions)
            if (action.inheritStates && Array.isArray(action.inheritStates)) {
                const originalLength = action.inheritStates.length;
                action.inheritStates = action.inheritStates.filter(
                    (name: string) => name !== deletedStateName
                );
                if (action.inheritStates.length !== originalLength) {
                    modified = true;
                }
            }

            // Handle SPLIT action specific fields
            if (action.actionType === 'SPLIT') {
                if (action.splitIndexState === deletedStateName) {
                    action.splitIndexState = null;
                    modified = true;
                }
            }

            // Handle JOIN action specific fields
            if (action.actionType === 'JOIN') {
                if (action.matchState === deletedStateName) {
                    action.matchState = null;
                    modified = true;
                }
                if (action.joinCountState === deletedStateName) {
                    action.joinCountState = null;
                    modified = true;
                }
            }

            // Handle BRANCH action - recursively clean nested actions
            if (action.actionType === 'BRANCH') {
                // Clean condition.stateName
                if (action.condition && action.condition.stateName === deletedStateName) {
                    action.condition = null;
                    modified = true;
                }

                // Recursively clean ifTrue actions
                if (action.ifTrue && Array.isArray(action.ifTrue)) {
                    const result = this.cleanActionsStateReferences(action.ifTrue, deletedStateId, deletedStateName);
                    action.ifTrue = result.actions;
                    if (result.modified) modified = true;
                }

                // Recursively clean ifFalse actions
                if (action.ifFalse && Array.isArray(action.ifFalse)) {
                    const result = this.cleanActionsStateReferences(action.ifFalse, deletedStateId, deletedStateName);
                    action.ifFalse = result.actions;
                    if (result.modified) modified = true;
                }
            }

            // Handle LOOP action - recursively clean nested actions
            if (action.actionType === 'LOOP' && action.actions && Array.isArray(action.actions)) {
                const result = this.cleanActionsStateReferences(action.actions, deletedStateId, deletedStateName);
                action.actions = result.actions;
                if (result.modified) modified = true;
            }
        }

        return { actions, modified };
    }

    /**
     * Clean up all references to a deleted state.
     * Scans all Generators, Activities, and Connectors for state references.
     *
     * @param stateId Unique ID of the deleted state
     * @param stateName Name of the deleted state (needed for name-based references)
     * @param page The page to scan for elements
     * @returns Number of elements that were modified
     */
    private async cleanupStateReferences(
        stateId: string,
        stateName: string,
        page: PageProxy
    ): Promise<number> {
        let affectedCount = 0;

        // Process all blocks (Generators and Activities)
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);
            if (!elementData) continue;

            // Get element type from q_data
            const typeInfo = this.storageAdapter.getElementType(block);
            const elementType = typeInfo?.type;

            let modified = false;

            // Process Generators
            if (elementType === SimulationObjectType.Generator) {
                // Clean generationConfig.initialStateModifications
                const modifications = elementData.generationConfig?.initialStateModifications;
                if (modifications && modifications.length > 0) {
                    const originalLength = modifications.length;
                    elementData.generationConfig.initialStateModifications =
                        modifications.filter(
                            (mod: any) => mod.stateUniqueId !== stateId
                        );
                    if (elementData.generationConfig.initialStateModifications.length !== originalLength) {
                        modified = true;
                    }
                }

                if (modified) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Generator);
                    affectedCount++;
                    this.debug.log('Cleaned state references from Generator:', block.id);
                }
            }

            // Process Activities
            if (elementType === SimulationObjectType.Activity) {
                // Clean sourceConfig.initialStateModifications
                if (elementData.sourceConfig?.initialStateModifications) {
                    const originalLength = elementData.sourceConfig.initialStateModifications.length;
                    elementData.sourceConfig.initialStateModifications =
                        elementData.sourceConfig.initialStateModifications.filter(
                            (mod: any) => mod.stateUniqueId !== stateId
                        );
                    if (elementData.sourceConfig.initialStateModifications.length !== originalLength) {
                        modified = true;
                    }
                }

                // Clean actions array
                if (elementData.actions && Array.isArray(elementData.actions)) {
                    const result = this.cleanActionsStateReferences(
                        elementData.actions,
                        stateId,
                        stateName
                    );
                    elementData.actions = result.actions;
                    if (result.modified) modified = true;
                }

                if (modified) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Activity);
                    affectedCount++;
                    this.debug.log('Cleaned state references from Activity:', block.id);
                }
            }
        }

        // Process all lines (Connectors)
        for (const [, line] of page.allLines) {
            const elementData = this.storageAdapter.getElementData<any>(line);
            if (!elementData) continue;

            // Get element type from q_data
            const lineTypeInfo = this.storageAdapter.getElementType(line);
            if (lineTypeInfo?.type !== SimulationObjectType.Connector) continue;

            let modified = false;

            // Clean legacy stateModifications array
            if (elementData.stateModifications && Array.isArray(elementData.stateModifications)) {
                const originalLength = elementData.stateModifications.length;
                elementData.stateModifications = elementData.stateModifications.filter(
                    (mod: any) => mod.stateUniqueId !== stateId
                );
                if (elementData.stateModifications.length !== originalLength) {
                    modified = true;
                }
            }

            // Clean stateCondition.stateName
            if (elementData.stateCondition && elementData.stateCondition.stateName === stateName) {
                elementData.stateCondition = null;
                modified = true;
            }

            // Clean actions array
            if (elementData.actions && Array.isArray(elementData.actions)) {
                const result = this.cleanActionsStateReferences(
                    elementData.actions,
                    stateId,
                    stateName
                );
                elementData.actions = result.actions;
                if (result.modified) modified = true;
            }

            if (modified) {
                this.storageAdapter.setElementData(line, elementData, SimulationObjectType.Connector);
                affectedCount++;
                this.debug.log('Cleaned state references from Connector:', line.id);
            }
        }

        return affectedCount;
    }

    /**
     * Helper method to clean entity references from an actions array.
     * Handles CREATE actions that can contain entityTemplateId references.
     *
     * Strategy:
     * - CREATE actions have entityTemplateId NULLIFIED (field is nullable)
     *
     * @param actions Array of actions to clean
     * @param deletedEntityId ID of the deleted entity
     * @returns Object with cleaned actions array and whether any modifications were made
     */
    private cleanActionsEntityReferences(
        actions: any[],
        deletedEntityId: string
    ): { actions: any[]; modified: boolean } {
        let modified = false;

        for (const action of actions) {
            if (!action || !action.actionType) continue;

            // Nullify CREATE action entityTemplateId if it references the deleted entity
            if (action.actionType === 'CREATE' && action.entityTemplateId === deletedEntityId) {
                this.debug.debug('Nullifying CREATE action entityTemplateId:', deletedEntityId);
                action.entityTemplateId = null;
                modified = true;
            }

            // Handle BRANCH action - recursively clean nested actions
            if (action.actionType === 'BRANCH') {
                // Recursively clean ifTrue actions
                if (action.ifTrue && Array.isArray(action.ifTrue)) {
                    const result = this.cleanActionsEntityReferences(action.ifTrue, deletedEntityId);
                    action.ifTrue = result.actions;
                    if (result.modified) modified = true;
                }

                // Recursively clean ifFalse actions
                if (action.ifFalse && Array.isArray(action.ifFalse)) {
                    const result = this.cleanActionsEntityReferences(action.ifFalse, deletedEntityId);
                    action.ifFalse = result.actions;
                    if (result.modified) modified = true;
                }
            }

            // Handle LOOP action - recursively clean nested actions
            if (action.actionType === 'LOOP' && action.actions && Array.isArray(action.actions)) {
                const result = this.cleanActionsEntityReferences(action.actions, deletedEntityId);
                action.actions = result.actions;
                if (result.modified) modified = true;
            }
        }

        return { actions, modified };
    }

    /**
     * Helper method to clean requirement references from an actions array.
     * Handles all action types that can contain resource requirement references.
     *
     * Strategy:
     * - SEIZE and RELEASE actions are DELETED (they're useless without a requirement)
     * - DELAY_WITH_RESOURCE actions have resourceRequirementId NULLIFIED (still valid as pure delay)
     *
     * @param actions Array of actions to clean
     * @param deletedRequirementId ID of the deleted requirement
     * @returns Object with cleaned actions array and whether any modifications were made
     */
    private cleanActionsRequirementReferences(
        actions: any[],
        deletedRequirementId: string
    ): { actions: any[]; modified: boolean } {
        let modified = false;

        // Filter out SEIZE and RELEASE actions that reference the deleted requirement
        const filteredActions = actions.filter(action => {
            if (!action || !action.actionType) return true;

            // Delete SEIZE actions referencing this requirement
            if (action.actionType === 'SEIZE' && action.resourceRequirementId === deletedRequirementId) {
                this.debug.debug('Removing SEIZE action referencing deleted requirement:', deletedRequirementId);
                modified = true;
                return false; // Remove this action
            }

            // Delete RELEASE actions referencing this requirement
            if (action.actionType === 'RELEASE' && action.resourceRequirementId === deletedRequirementId) {
                this.debug.debug('Removing RELEASE action referencing deleted requirement:', deletedRequirementId);
                modified = true;
                return false; // Remove this action
            }

            return true; // Keep this action
        });

        // Process remaining actions for DELAY_WITH_RESOURCE nullification and nested actions
        for (const action of filteredActions) {
            if (!action || !action.actionType) continue;

            // Nullify DELAY_WITH_RESOURCE resourceRequirementId (still valid as pure delay)
            if (action.actionType === 'DELAY_WITH_RESOURCE' && action.resourceRequirementId === deletedRequirementId) {
                this.debug.debug('Nullifying DELAY_WITH_RESOURCE resourceRequirementId:', deletedRequirementId);
                action.resourceRequirementId = null;
                modified = true;
            }

            // Handle BRANCH action - recursively clean nested actions
            if (action.actionType === 'BRANCH') {
                // Recursively clean ifTrue actions
                if (action.ifTrue && Array.isArray(action.ifTrue)) {
                    const result = this.cleanActionsRequirementReferences(action.ifTrue, deletedRequirementId);
                    action.ifTrue = result.actions;
                    if (result.modified) modified = true;
                }

                // Recursively clean ifFalse actions
                if (action.ifFalse && Array.isArray(action.ifFalse)) {
                    const result = this.cleanActionsRequirementReferences(action.ifFalse, deletedRequirementId);
                    action.ifFalse = result.actions;
                    if (result.modified) modified = true;
                }
            }

            // Handle LOOP action - recursively clean nested actions
            if (action.actionType === 'LOOP' && action.actions && Array.isArray(action.actions)) {
                const result = this.cleanActionsRequirementReferences(action.actions, deletedRequirementId);
                action.actions = result.actions;
                if (result.modified) modified = true;
            }
        }

        return { actions: filteredActions, modified };
    }

    /**
     * Clean up all references to a deleted resource requirement.
     *
     * Action cleanup strategy:
     * - SEIZE and RELEASE actions: DELETED (cannot function without requirement)
     * - DELAY_WITH_RESOURCE actions: resourceRequirementId NULLIFIED (still valid as pure delay)
     */
    private async cleanupRequirementReferences(requirementId: string, page: PageProxy): Promise<number> {
        this.debug.log('Cleaning up references to requirement:', requirementId);
        let affectedCount = 0;

        // Process all activities - update actions that reference the deleted requirement
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);
            if (!elementData) continue;

            // Get element type from q_data
            const typeInfo = this.storageAdapter.getElementType(block);
            const elementType = typeInfo?.type;

            if (elementType === SimulationObjectType.Activity && elementData.actions) {
                const result = this.cleanActionsRequirementReferences(
                    elementData.actions,
                    requirementId
                );

                if (result.modified) {
                    elementData.actions = result.actions;
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Activity);
                    affectedCount++;
                    this.debug.log('Updated activity after requirement cleanup:', block.id);
                }
            }
        }

        return affectedCount;
    }

    /**
     * Clean up all references to a deleted Entity.
     * Scans all Generators, Activities, and Connectors for entity references.
     *
     * Reference cleanup strategy:
     * - Generator.generationConfig.entityId: SET TO "" (required field, empty = unset)
     * - Activity.sourceConfig.entityId: SET TO "" (required field, empty = unset)
     * - CreateAction.entityTemplateId: SET TO null (already nullable)
     *
     * @param entityId ID of the deleted entity
     * @param page The page to scan
     * @returns Number of elements that were modified
     */
    private async cleanupEntityReferences(
        entityId: string,
        page: PageProxy
    ): Promise<number> {
        this.debug.log('Cleaning up references to entity:', entityId);
        let affectedCount = 0;

        // Process all blocks (Generators and Activities)
        for (const [, block] of page.allBlocks) {
            const elementData = this.storageAdapter.getElementData<any>(block);
            if (!elementData) continue;

            // Get element type from q_data
            const typeInfo = this.storageAdapter.getElementType(block);
            const elementType = typeInfo?.type;

            let modified = false;

            // Process Generators - clean generationConfig.entityId
            if (elementType === SimulationObjectType.Generator) {
                if (elementData.generationConfig?.entityId === entityId) {
                    this.debug.debug('Clearing Generator generationConfig.entityId:', entityId);
                    elementData.generationConfig.entityId = "";
                    modified = true;
                }

                if (modified) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Generator);
                    affectedCount++;
                    this.debug.log('Cleaned entity references from Generator:', block.id);
                }
            }

            // Process Activities - clean sourceConfig.entityId and actions
            if (elementType === SimulationObjectType.Activity) {
                // Clean sourceConfig.entityId
                if (elementData.sourceConfig?.entityId === entityId) {
                    this.debug.debug('Clearing Activity sourceConfig.entityId:', entityId);
                    elementData.sourceConfig.entityId = "";
                    modified = true;
                }

                // Clean actions array (for CREATE actions)
                if (elementData.actions && Array.isArray(elementData.actions)) {
                    const result = this.cleanActionsEntityReferences(
                        elementData.actions,
                        entityId
                    );
                    elementData.actions = result.actions;
                    if (result.modified) modified = true;
                }

                if (modified) {
                    this.storageAdapter.setElementData(block, elementData, SimulationObjectType.Activity);
                    affectedCount++;
                    this.debug.log('Cleaned entity references from Activity:', block.id);
                }
            }
        }

        // Process all lines (Connectors) - clean actions array
        for (const [, line] of page.allLines) {
            const elementData = this.storageAdapter.getElementData<any>(line);
            if (!elementData) continue;

            // Get element type from q_data
            const lineTypeInfo = this.storageAdapter.getElementType(line);
            if (lineTypeInfo?.type !== SimulationObjectType.Connector) continue;

            let modified = false;

            // Clean actions array (for CREATE actions)
            if (elementData.actions && Array.isArray(elementData.actions)) {
                const result = this.cleanActionsEntityReferences(
                    elementData.actions,
                    entityId
                );
                elementData.actions = result.actions;
                if (result.modified) modified = true;
            }

            if (modified) {
                this.storageAdapter.setElementData(line, elementData, SimulationObjectType.Connector);
                affectedCount++;
                this.debug.log('Cleaned entity references from Connector:', line.id);
            }
        }

        return affectedCount;
    }

    /**
     * Helper to check if a clause or its sub-clauses reference a specific resource.
     */
    private clauseReferencesResource(clause: any, resourceId: string): boolean {
        // Check requests in this clause
        if (clause.requests && Array.isArray(clause.requests)) {
            if (clause.requests.some((request: any) => request.resourceId === resourceId)) {
                return true;
            }
        }

        // Recursively check sub-clauses
        if (clause.subClauses && Array.isArray(clause.subClauses)) {
            for (const subClause of clause.subClauses) {
                if (this.clauseReferencesResource(subClause, resourceId)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Clean up all ResourceRequirements that reference a deleted Resource,
     * then cascade to clean up actions that reference those requirements.
     *
     * Auto-generated ResourceRequirements (where req.id === resourceId) are deleted.
     * Also removes any ResourceRequirement that has a ResourceRequest referencing the deleted resource.
     *
     * @param resourceId ID of the deleted resource
     * @param page The page to scan
     * @returns Array of requirement IDs that were deleted (for cascade cleanup)
     */
    private async cleanupResourceReferences(
        resourceId: string,
        page: PageProxy
    ): Promise<string[]> {
        this.debug.log('Cleaning up references to resource:', resourceId);
        const deletedRequirementIds: string[] = [];

        // Get current resource requirements
        const requirements = this.storageAdapter.getResourceRequirements(page) || [];

        // Find requirements to delete
        const updatedRequirements = requirements.filter(req => {
            // Delete auto-generated requirement (same ID as resource)
            if (req.id === resourceId) {
                this.debug.log('Removing auto-generated requirement for resource:', resourceId);
                deletedRequirementIds.push(req.id);
                return false;
            }

            // Check if any rootClauses reference this resource
            if (req.rootClauses && Array.isArray(req.rootClauses)) {
                for (const clause of req.rootClauses) {
                    if (this.clauseReferencesResource(clause, resourceId)) {
                        this.debug.log('Removing requirement that references deleted resource:', req.id);
                        deletedRequirementIds.push(req.id);
                        return false;
                    }
                }
            }

            return true;
        });

        // Save updated requirements if any were deleted
        if (deletedRequirementIds.length > 0) {
            this.storageAdapter.setResourceRequirements(page, updatedRequirements);
            this.debug.log('Deleted requirements count:', deletedRequirementIds.length);
        }

        return deletedRequirementIds;
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
            let totalAffected = 0;
            for (const deletedState of deletedStates) {
                this.debug.log('Detected deleted state, cleaning up references:', {
                    stateId: deletedState.id,
                    stateName: deletedState.name
                });
                const affectedCount = await this.cleanupStateReferences(
                    deletedState.id,
                    deletedState.name,
                    page
                );
                totalAffected += affectedCount;
            }

            // Save states to page storage
            this.storageAdapter.setStates(page, states);

            // Mark model as dirty to force rebuild on next access
            this.markModelDirty();

            this.debug.log('updateStates - Complete with cascading cleanup', {
                deletedCount: deletedStates.length,
                affectedElements: totalAffected
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
     * Ensures a Baseline scenario exists for the given page.
     * If no scenario has isBaseline === true, creates one and persists it.
     * Called once per page load during model definition initialization.
     */
    private ensureBaselineScenario(page: PageProxy): void {
        const scenarios = this.storageAdapter.getScenarios(page);
        const { scenarios: updated, baselineAdded } = ensureBaselineScenario(scenarios);
        if (baselineAdded) {
            this.debug.log('ensureBaselineScenario - Creating Baseline scenario');
            this.storageAdapter.setScenarios(page, updated);
        }
    }

    /**
     * One-time migration: adopts legacy simulation runs from Azure as scenario definitions.
     * Called when a document upgrades from a version before 2026.02.23 (when q_scenarios was introduced).
     * Each existing run in Azure gets a ScenarioDefinition with the run's blob folder ID as the scenario ID
     * and empty changeRequests (they were all baseline-equivalent runs).
     * Runs asynchronously after the version stamp is updated. If it fails, runs remain in Azure but
     * won't appear as scenario definitions — user would see just Baseline.
     */
    private async adoptLegacySimulationRuns(page: PageProxy): Promise<void> {
        this.debug.log('adoptLegacySimulationRuns - Starting scenario adoption for pre-2026.02.23 document');

        try {
            const client = ModelManager.getClient();
            const documentProxy = new DocumentProxy(client);
            const documentId = documentProxy.id;

            this.debug.log('adoptLegacySimulationRuns - Fetching runs from Azure', { documentId });

            const result = await LucidDataActionUtility.performDataAction(client, {
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'ListScenarios',
                actionData: { documentId },
                asynchronous: true,
            });

            const responseData = result.json || result;
            const runs = responseData?.scenarios || [];

            if (runs.length === 0) {
                this.debug.log('adoptLegacySimulationRuns - No existing runs found, nothing to adopt');
                return;
            }

            this.debug.log('adoptLegacySimulationRuns - Found runs to adopt', { count: runs.length });

            // Read current scenarios (should already have Baseline from ensureBaselineScenario)
            const existingScenarios = this.storageAdapter.getScenarios(page);

            // Create a scenario definition for each legacy run
            const adoptedScenarios: ISerializedScenario[] = runs.map((run: any) => ({
                id: run.id,
                name: run.name || run.id,
                description: '',
                isBaseline: false,
                changeRequests: [],
            }));

            // Merge: existing scenarios (Baseline) + adopted scenarios
            const merged = [...existingScenarios, ...adoptedScenarios];
            this.storageAdapter.setScenarios(page, merged);

            this.debug.log('adoptLegacySimulationRuns - Adopted runs as scenarios', {
                adoptedCount: adoptedScenarios.length,
                totalCount: merged.length,
            });
        } catch (error) {
            this.debug.error('adoptLegacySimulationRuns - Failed (runs not lost in Azure):', error);
            throw error;
        }
    }

    /**
     * Updates the scenarios array for the model.
     * Scenarios have no cross-references to clean up, so this is a simple save.
     */
    public async updateScenarios(scenarios: ISerializedScenario[], page: PageProxy): Promise<void> {
        this.debug.log('updateScenarios - Start', {
            scenariosCount: scenarios.length,
            pageId: page.id,
        });

        try {
            this.storageAdapter.setScenarios(page, scenarios);
            this.markModelDirty();

            this.debug.log('updateScenarios - Complete');
        } catch (error) {
            this.debug.error('Error in updateScenarios:', error);
            throw error;
        }
    }

    /**
     * Defensive cleanup: Filters out orphaned state modifications from Generator data.
     * This handles edge cases where state modifications reference deleted states that
     * weren't properly cleaned up by cascading deletion (timing issues, different code paths,
     * or imported/loaded data with orphaned references).
     *
     * @param elementData The element data being saved
     * @param type The simulation object type
     * @param page The page to get valid states from
     * @returns Object with cleaned data and whether any modifications were removed
     */
    private cleanOrphanedStateModifications(
        elementData: any,
        type: SimulationObjectType,
        page: PageProxy
    ): { data: any; cleaned: boolean } {
        let cleaned = false;

        if (type === SimulationObjectType.Generator) {
            const modifications = elementData.generationConfig?.initialStateModifications;
            if (modifications && Array.isArray(modifications) && modifications.length > 0) {
                // Get valid state IDs from storage
                const states = this.storageAdapter.getStates(page) || [];
                const validStateIds = new Set(states.map(s => s.id));

                const originalLength = modifications.length;
                elementData.generationConfig.initialStateModifications = modifications.filter(
                    (mod: any) => validStateIds.has(mod.stateUniqueId)
                );

                if (elementData.generationConfig.initialStateModifications.length !== originalLength) {
                    cleaned = true;
                    this.debug.log('Cleaned orphaned state modifications from Generator', {
                        elementId: elementData.id,
                        originalCount: originalLength,
                        cleanedCount: elementData.generationConfig.initialStateModifications.length,
                        removedCount: originalLength - elementData.generationConfig.initialStateModifications.length
                    });
                }
            }
        }

        return { data: elementData, cleaned };
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
            let elementData = {
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

            // Defensive cleanup: Filter orphaned state modifications for Generators
            const { data: cleanedData, cleaned } = this.cleanOrphanedStateModifications(elementData, type, page);
            if (cleaned) {
                elementData = cleanedData;
                this.debug.debug('Element data cleaned of orphaned state modifications');
            }

            // Register and save
            this.debug.debug('Registering element');
            this.registerElement(elementData, element);

            this.debug.debug('Setting element data', {
                elementId: element.id,
                type
            });
            this.setElementData(
                element,
                elementData,
                type
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