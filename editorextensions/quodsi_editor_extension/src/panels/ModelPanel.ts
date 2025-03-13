// panels/ModelPanel.ts
import {
    PanelLocation,
    EditorClient,
    ItemProxy,
    PageProxy,
    Viewport,
    BlockProxy,
    DocumentProxy,
    ElementProxy,
    JsonObject as LucidJsonObject,
    Panel,
    UserProxy,
    PageDefinition,
    TableBlockProxy,
    BlockDefinition,
    DataActionResponse,
    DataProxy
} from 'lucid-extension-sdk';
import {
    ModelItemData,
    ExtensionMessaging,
    isValidMessage,
    JsonSerializable,
    MessagePayloads,
    MessageTypes,
    MetaData,
    ModelStructure,
    UnconvertedSelectionState,
    SimulationObjectSelectionState,
    JsonObject as SharedJsonObject,
    SelectionType,
    Model,
    SimulationObjectType,
    SelectionState,
    EditorReferenceData,
    DiagramElementType,
    ModelSerializerFactory

} from '@quodsi/shared';
import { createLucidApiService, parseCsvBlob, calculateTableDimensions } from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { SelectionManager, TreeStateManager } from '../managers';
import { PageSchemaConversionService } from '../services/conversion/PageSchemaConversionService';
import { ModelDataSource } from '../data_sources/model/ModelDataSource';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { LucidPageConversionService } from '../services/conversion/LucidPageConversionService';
import { StorageAdapter } from '../core/StorageAdapter';
import LucidVersionManager from '../versioning';
import { SimulationResultsReader } from '../data_sources';
import { SimulationResultsDashboard } from '../dashboard/SimulationResultsDashboard';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '../dashboard/interfaces/config/DashboardConfig';


const BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';

export class ModelPanel extends Panel {
    private static readonly LOG_PREFIX = '[ModelPanel]';
    private loggingEnabled: boolean = false;
    private selectionManager: SelectionManager;
    private treeStateManager: TreeStateManager;
    private messaging: ExtensionMessaging;
    private reactAppReady: boolean = false;
    private modelManager: ModelManager;
    private expandedNodes: Set<string> = new Set();
    private currentModelStructure?: ModelStructure = undefined;
    private currentSelection: SelectionState = {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
    };
    private isHandlingSelectionChange: boolean = false;
    private versionManager: LucidVersionManager;

    constructor(client: EditorClient, modelManager: ModelManager) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });
        this.versionManager = new LucidVersionManager();
        // Initialize services and managers but don't perform any operations yet
        this.messaging = ExtensionMessaging.getInstance();
        this.modelManager = modelManager;
        this.selectionManager = new SelectionManager(modelManager);
        this.treeStateManager = new TreeStateManager(modelManager);
        // Set up event handlers
        this.setupModelMessageHandlers();
        this.log('Model Panel initialized');
    }
    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    private isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    private log(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.log(`${ModelPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${ModelPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private setupModelMessageHandlers(): void {
        this.logError('Setting up message handlers START');
        // React App Ready - already handled by BasePanel

        // Model Operations
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            this.logError('REACT_APP_READY message received in handler');
            this.handleReactReady();
        });
        this.messaging.onMessage(MessageTypes.SIMULATE_MODEL, () =>
            this.handleSimulateModel()
        );
        this.messaging.onMessage(MessageTypes.SIMULATION_STATUS_UPDATE, (data) =>
            this.handleSimulationStatusUpdate(data)
        );
        // Setup error handler
        this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
            this.logError('Error received:', payload);
        });

        this.messaging.onMessage(MessageTypes.CONVERT_ELEMENT, (data) =>
            this.handleConvertElement(data));
        this.messaging.onMessage(MessageTypes.REMOVE_MODEL, () => this.handleRemoveModel());
        this.messaging.onMessage(MessageTypes.CONVERT_PAGE, () => this.handlePageConvertRequest());
        this.messaging.onMessage(MessageTypes.VALIDATE_MODEL, () => this.handleValidateModel());

        // Element Operations
        this.messaging.onMessage(MessageTypes.UPDATE_ELEMENT_DATA, (data) =>
            this.handleUpdateElementData(data));

        // Tree State Management
        this.messaging.onMessage(MessageTypes.TREE_NODE_TOGGLE, (data) =>
            this.handleTreeNodeToggle(data.nodeId, data.expanded));
        this.messaging.onMessage(MessageTypes.TREE_STATE_UPDATE, (data) =>
            this.handleTreeStateUpdate(data.expandedNodes));
        this.messaging.onMessage(MessageTypes.TREE_NODE_EXPAND_PATH, (data) =>
            this.handleExpandPath(data.nodeId));
        this.messaging.onMessage(MessageTypes.OUTPUT_CREATE_PAGE, (data) => {
            this.handleOutputCreatePage(data);
        });
        this.logError('Setting up message handlers END');
    }
    // Improved model initialization code with better logging and error handling
    async initializeOrUpdateModel() {
        try {
            console.log("[ModelPanel] Starting model initialization or update");
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const dataProxy = new DataProxy(this.client);
            // Log all existing data sources
            console.log("[ModelPanel] Available data sources:");
            for (const [id, source] of dataProxy.dataSources) {
                try {
                    const name = source.getName();
                    const config = source.getSourceConfig();
                    console.log(`[ModelPanel]   - ${id}: name="${name}", config:`, config);
                } catch (e) {
                    console.log(`[ModelPanel]   - ${id}: error accessing details`, e);
                }
            }

            // Create the ModelDataSource
            const modelDataSource = new ModelDataSource(dataProxy);
            console.log("[ModelPanel] ModelDataSource created");

            // Initialize the data source
            const initResult = await modelDataSource.initialize();
            console.log("[ModelPanel] ModelDataSource initialization result:", initResult);

            if (!initResult) {
                console.error("[ModelPanel] Failed to initialize model data source");
                return null;
            }

            // Get current page
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                console.error("[ModelPanel] No current page found");
                return null;
            }

            const documentId = document.id;
            const pageId = currentPage.id;
            const modelName = "Process Model";  // Name for your model

            console.log("[ModelPanel] Current context:", {
                documentId,
                pageId,
                modelName
            });

            // Get the repository for debugging
            const repo = modelDataSource.getModelDefinitionRepository();
            // This requires exposing dataSourceId as a property or adding a getter in ModelDefinitionRepository
            console.log("[ModelPanel] Using data source ID:", repo.getDataSourceId ? repo.getDataSourceId() : "unknown");

            // First check if a model definition already exists
            console.log("[ModelPanel] Checking for existing model definition");
            const existingModel = await modelDataSource.findModelDefinition(documentId, pageId);

            console.log("[ModelPanel] Existing model check result:", existingModel);

            // Create or update the model definition
            let modelDefinition;

            if (existingModel) {
                console.log("[ModelPanel] Updating existing model:", existingModel.id);

                // Only update if needed
                if (existingModel.name !== modelName) {
                    console.log("[ModelPanel] Model name has changed, updating...");
                    modelDefinition = await modelDataSource.updateModelDefinition({
                        id: existingModel.id,
                        name: modelName
                    });
                } else {
                    console.log("[ModelPanel] No changes needed, using existing model");
                    modelDefinition = existingModel;
                }
            } else {
                console.log("[ModelPanel] No existing model found, creating new one");

                // For debugging, try to list all models
                const allModels = await modelDataSource.listModelDefinitions();
                console.log("[ModelPanel] All existing models:", allModels);

                modelDefinition = await modelDataSource.createModelDefinition(
                    documentId,
                    pageId,
                    modelName
                );
            }

            // Check the result
            if (modelDefinition) {
                console.log("[ModelPanel] Model operation successful:", modelDefinition);
                return modelDefinition;
            } else {
                console.error("[ModelPanel] Failed to create/update model definition");
                return null;
            }
        } catch (error) {
            console.error("[ModelPanel] Error in initializeOrUpdateModel:", error);
            return null;
        }
    }

    
    private async handleOutputCreatePage(data: { pageName: string }): Promise<void> {
        console.log('[ModelPanel] Output page creation requested:', data.pageName);

        try {
            //await this.list_blocks();
            // this.initializeOrUpdateModel()
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const user = new UserProxy(this.client);
            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'ImportSimulationResults',
                actionData: {documentId: document.id, scenarioId: BASELINE_SCENARIO_ID},
                asynchronous: true
            });
            this.handleOutputCreateDashboard()


        } catch (error) {
            console.error('[SimulationResultsTableGenerator] Error creating output page:', error);
            this.messaging.sendMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }
    private async handleOutputCreateDashboard(): Promise<void> {
        try {
            console.log('[ModelPanel] Creating simulation results dashboard...');

            // Create dashboard instance with default configuration
            const dashboard = new SimulationResultsDashboard(this.client);

            // Generate a dashboard with the current date/time in the name
            const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
            const result = await dashboard.createDashboard(`Simulation Results - ${timestamp}`);

            console.log(`[ModelPanel] Dashboard created with ${result.tables.length} tables`);

            // Check for issues
            if (result.emptyDataTypes.length > 0) {
                console.log(`[ModelPanel] The following data types had no data: ${result.emptyDataTypes.join(', ')}`);
            }

            if (result.errors.length > 0) {
                console.warn(`[ModelPanel] ${result.errors.length} errors occurred while creating the dashboard`);
                result.errors.forEach(err => {
                    console.error(`[ModelPanel] Error creating ${err.type} table:`, err.error);
                });
            }
        } catch (error) {
            console.error('[ModelPanel] Error creating simulation results dashboard:', error);
        }
    }
    private async list_blocks(): Promise<void> {

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (currentPage)
        {
            for (const [blockId, block] of currentPage.allBlocks) {
                console.log('[ModelPanel] Block of class ' + block.getClassName() + ' (' + blockId + '):')
                for (const [propertyName, propertyValue] of block.properties) {
                    console.log('[ModelPanel] ' + propertyName, propertyValue);
                }
            }
        }

    }

    private async handleSimulationStatusUpdate(
        data: MessagePayloads[MessageTypes.SIMULATION_STATUS_UPDATE]
    ): Promise<void> {
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();

            if (!currentPage) {
                throw new Error('No active page found');
            }

            // Update the simulation status using StorageAdapter
            this.modelManager.getStorageAdapter().setSimulationStatus(currentPage, data.pageStatus);

            // Send a success message back to React
            this.sendTypedMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
                pageStatus: data.pageStatus
            });
        } catch (error) {
            this.logError('Failed to update page status:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to update simulation status: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    private async updateModelStructure(): Promise<void> {
        // Get model structure from ModelManager
        this.currentModelStructure = await this.modelManager.getModelStructure();
        this.log('Model structure updated:', this.currentModelStructure);

        // Validate model
        const validationResult = await this.modelManager.validateModel();
        this.log('Model validation result:', validationResult);

        // If we're not in a selection change context, notify the React app of the validation update
        if (!this.isHandlingSelectionChange) {
            this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
        }
    }

    private async createSimulationObjectPayload(
        page: ElementProxy,  // Keep this as PageProxy for the actual page
        item: ItemProxy,  // Change this to ItemProxy to accept both ElementProxy and PageProxy
        basePayload: any
    ): Promise<MessagePayloads[MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]> {
        const metadata = this.modelManager.getMetadata(item);
        if (!metadata) {
            throw new Error('No metadata found for item');
        }

        const modelItemData = await this.buildModelItemData(item);
        const simulationSelection: SimulationObjectSelectionState = {
            pageId: page.id,  // Use the page parameter here
            selectedId: item.id,
            objectType: metadata.type,
            diagramElementType: item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE
        };

        // Create referenceData if it's a Generator
        this.log("DEBUG - Before Generator check:", {
            itemId: item.id,
            metadata,
            type: metadata?.type,
            isGenerator: metadata?.type === SimulationObjectType.Generator
        });

        let referenceData: EditorReferenceData = {};
        if (metadata.type === SimulationObjectType.Generator) {
            const modelDef = await this.modelManager.getModelDefinition();
            if (modelDef) {
                const allEntities = modelDef.entities.getAll();

                referenceData.entities = allEntities.map(e => {
                    this.log("Mapping entity:", e);
                    return {
                        id: e.id,
                        name: e.name
                    };
                });
            }
        }
        if (metadata.type === SimulationObjectType.Activity || metadata.type === SimulationObjectType.Connector) {
            const modelDef = await this.modelManager.getModelDefinition();
            if (modelDef) {
                const requirements = modelDef.resourceRequirements.getAll();
                referenceData.resourceRequirements = requirements
            }
        }

        return {
            ...basePayload,
            simulationSelection,
            modelItemData,
            modelStructure: this.currentModelStructure,
            referenceData
        };
    }


    private async handleConvertElement(
        data: MessagePayloads[MessageTypes.CONVERT_ELEMENT]
    ): Promise<void> {
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                throw new Error('No active page found');
            }

            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();
            const element = selectedItems.find(item => item.id === data.elementId);
            if (!element) {
                throw new Error(`Element not found in selection: ${data.elementId}`);
            }

            // Get model definition (might be needed by some conversions)
            const modelDef = await this.modelManager.getModelDefinition();
            if (!modelDef) {
                throw new Error('Model definition not found');
            }

            // Create the platform object with conversion flag
            // This will handle all the data creation and storage internally
            const elementFactory = new LucidElementFactory(this.modelManager.getStorageAdapter());
            const platformObject = elementFactory.createPlatformObject(
                element,
                data.type,
                true  // isConversion flag
            );

            await this.updateModelStructure();

            if (!this.currentModelStructure) {
                throw new Error('Failed to update model structure after conversion');
            }

            const payload = await this.createSimulationObjectPayload(
                currentPage,
                element,
                {
                    selectionState: {
                        pageId: currentPage.id,
                        selectedIds: [data.elementId],
                        selectionType: SelectionType.ACTIVITY
                    }
                }
            );
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT, payload);

        } catch (error) {
            this.logError('Error converting element:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to convert element: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    /**
     * Handles tree node expansion state changes
     */
    private handleTreeNodeToggle(nodeId: string, expanded: boolean): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (!currentPage) return;

        this.treeStateManager.handleNodeToggle(nodeId, expanded, currentPage);
        this.sendTreeStateUpdate();
    }

    /**
     * Handles bulk tree state updates
     */
    private handleTreeStateUpdate(expandedNodes: string[]): void {
        this.log('Tree state update:', { expandedNodes });
        this.expandedNodes = new Set(expandedNodes);

        // Get current page and save to storage
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (currentPage) {
            this.log('Saving expanded nodes to storage:', expandedNodes);
            this.modelManager.setExpandedNodes(currentPage, expandedNodes);
        }

        this.sendTreeStateUpdate();
    }

    /**
     * Expands the path to a specific node
     */
    private handleExpandPath(nodeId: string): void {
        if (!this.currentModelStructure) return;

        // Get path nodes from ModelManager
        const pathNodes = this.modelManager.findPathToNode(this.currentModelStructure, nodeId);

        // Add all nodes in path to expanded set
        pathNodes.forEach(id => this.expandedNodes.add(id));

        this.sendTreeStateUpdate();
    }

    /**
     * Sends current tree state to React app
     */
    private sendTreeStateUpdate(): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (!currentPage) return;

        this.sendTypedMessage(MessageTypes.TREE_STATE_SYNC, {
            expandedNodes: Array.from(this.expandedNodes),
            pageId: currentPage.id
        });
    }
    private async initializeModelManager(): Promise<void> {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (!currentPage || !this.modelManager.isQuodsiModel(currentPage)) {
            this.log('Page is not a Quodsi model, skipping initialization');
            return;
        }

        try {
            const modelData = this.modelManager.getElementData<Model>(currentPage);
            if (modelData) {
                await this.modelManager.initializeModel(modelData, currentPage);
                this.log('Model initialization complete');
            }
        } catch (error) {
            this.logError('Error initializing model:', error);
            throw new Error(`Failed to initialize model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Shows the panel
     */
    public show(): void {
        this.log('Show called');
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        this.log('Current page at show:', currentPage);

        this.initializeModelManager(); // Re-initialize when panel is shown
        super.show();
    }

    /**
     * Hides the panel
     */
    public hide(): void {
        this.log('Hide called');
        super.hide();
    }

    async handleValidateRequest(): Promise<void> {
        const validationResult = await this.modelManager.validateModel();

        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
    }

    public async handleSelectionChange(items: ItemProxy[]): Promise<void> {
        this.isHandlingSelectionChange = true;
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            await this.updateModelStructure();
            const selectionState = await this.selectionManager.determineSelectionState(currentPage, items);
            this.selectionManager.setCurrentSelection(selectionState);

            if (this.reactAppReady) {
                await this.sendSelectionBasedMessage(selectionState, items, currentPage);
            }
        } catch (error) {
            this.handleError('Error handling selection change:', error);
        } finally {
            this.isHandlingSelectionChange = false;
        }
    }

    private async sendSelectionBasedMessage(selectionState: SelectionState, items: ItemProxy[], currentPage: ElementProxy): Promise<void> {
        this.log("DEBUG - sendSelectionBasedMessage START - Selection Type:", selectionState.selectionType);
        if (items.length === 1) {
            const item = items[0];
            this.log("DEBUG - Item metadata:", this.modelManager.getMetadata(item));
        }
        // Convert ElementProxy to PageProxy if needed
        const page = new PageProxy(currentPage.id, this.client);

        // Early check - if page is not a model, always send PAGE_NO_MODEL
        if (!this.modelManager.isQuodsiModel(page)) {
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL, {
                pageId: page.id
            });
            return;
        }
        const modelStructure = this.currentModelStructure || { elements: [], hierarchy: {} };
        const expandedNodes = this.treeStateManager.getExpandedNodes();
        const validationResult = await this.modelManager.validateModel();
        const document = new DocumentProxy(this.client);
        const documentId = document.id;
        const basePayload = {
            selectionState,
            modelStructure,
            expandedNodes,
            validationResult,
            documentId
        };

        switch (selectionState.selectionType) {
            case SelectionType.NONE: {
                // Build model item data for the page since it's a model
                const modelItemData = await this.buildModelItemData(page);

                const payload = {
                    ...basePayload,
                    pageSelection: {
                        pageId: currentPage.id
                    },
                    modelStructure,  // Already in basePayload
                    modelItemData    // Add the page's model data
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL, payload);
                break;
            }

            case SelectionType.MULTIPLE: {
                const modelItemData = await Promise.all(
                    items.map(item => this.buildModelItemData(item))
                );

                const payload = {
                    ...basePayload,
                    multipleSelection: {
                        pageId: currentPage.id,
                        selectedIds: items.map(item => item.id)
                    },
                    modelItemData
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_MULTIPLE, payload);
                break;
            }

            case SelectionType.UNCONVERTED_ELEMENT: {
                if (items.length === 1) {
                    const item = items[0];
                    const modelItemData = await this.buildModelItemData(item);
                    modelItemData.isUnconverted = true;

                    const unconvertedSelection: UnconvertedSelectionState = {
                        pageId: currentPage.id,
                        selectedId: item.id,
                        diagramElementType: item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE
                    };

                    const payload = {
                        ...basePayload,
                        unconvertedSelection,
                        modelItemData
                    };
                    this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_UNCONVERTED, payload);
                }
                break;
            }

            case SelectionType.ACTIVITY:
            case SelectionType.CONNECTOR:
            case SelectionType.ENTITY:
            case SelectionType.GENERATOR:
            case SelectionType.RESOURCE:
            case SelectionType.MODEL: {
                if (items.length === 1) {
                    const item = items[0];
                    const metadata = this.modelManager.getMetadata(item);
                    if (metadata) {
                        const payload = await this.createSimulationObjectPayload(
                            currentPage,  // Pass the page
                            item,        // Pass the selected item
                            basePayload
                        );
                        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT, payload);
                    }
                }
                break;
            }

            default: {
                // Build model item data for the page since it's a model
                const modelItemData = await this.buildModelItemData(page);

                const payload = {
                    ...basePayload,
                    pageSelection: {
                        pageId: currentPage.id
                    },
                    modelStructure,  // Already in basePayload
                    modelItemData    // Add the page's model data
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL, payload);
                break;
            }
        }
    }

    private handleError(message: string, error: any): void {
        this.logError(`${message}`, error);
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
    // Keep this as the primary builder
    private async buildModelItemData(item: ItemProxy | PageProxy): Promise<ModelItemData> {
        const rawData = this.modelManager.getElementData(item);
        const metadata = this.modelManager.getMetadata(item);

        // Determine name based on item type
        let name: string;
        if (item instanceof PageProxy) {
            name = item.getTitle() || 'Untitled Model';
        } else if (item instanceof BlockProxy) {
            name = item.id || 'Unnamed Block';
        } else {
            name = 'Unnamed Connector';
        }

        // Ensure metadata has all required fields
        const defaultMetadata: MetaData = {
            type: item instanceof PageProxy ? SimulationObjectType.Model : SimulationObjectType.None,
            version: this.modelManager.CURRENT_VERSION,
            lastModified: new Date().toISOString(),
            id: item.id,
            ...(metadata || {})
        };

        // Handle unconverted elements
        if (item instanceof ItemProxy && this.modelManager.isUnconvertedElement(item)) {
            defaultMetadata.isUnconverted = true;
        }

        // Convert Lucid JsonObject to shared JsonObject type
        const convertedData = rawData ? JSON.parse(JSON.stringify(rawData)) as SharedJsonObject : {};

        return {
            id: item.id,
            data: convertedData,
            metadata: defaultMetadata,
            name
        };
    }

    // Helper method for building multiple items
    private async buildModelItemDataArray(items: (ItemProxy | PageProxy)[]): Promise<ModelItemData[]> {
        return Promise.all(items.map(item => this.buildModelItemData(item)));
    }

    /**
     * Handles model removal request
     */
    private async handleRemoveModel(): Promise<void> {
        try {
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            // Remove the model data from the page
            await this.modelManager.removeModelFromPage(currentPage);
            // 1. Create an instance of DataProxy
            const dataProxy = new DataProxy(this.client);
            // 2. Create the ModelDataSource
            const modelDataSource = new ModelDataSource(dataProxy);
            // 3. Initialize the data source
            await modelDataSource.initialize();
            // 4. Delete the model definition
            const success = await modelDataSource.deleteModelDefinition(
                document.id,  // The document ID 
                currentPage.id       // The page ID
            );

            // 5. Check the result
            if (success) {
                console.log("Model definition deleted successfully");
            } else {
                console.error("Failed to delete model definition");
            }
            // Since the model was just removed, we know this is now a non-model page
            // Directly send PAGE_NO_MODEL state - no need for modelRemoved message
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL, {
                pageId: currentPage.id
            });

        } catch (error) {
            this.handleError('Error removing model:', error);
        }
    }

    private async handleReactReady(): Promise<void> {
        if (this.reactAppReady) {
            this.logError('React app already ready, skipping initialization');
            return;
        }

        this.logError('handleReactReady');
        this.reactAppReady = true;

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            this.logError('No active page found during React ready');
            return;
        }

        try {
            // Check for and handle any needed version upgrades
            // await this.versionManager.handlePageLoad(currentPage);
            // Now initialize the model in response to a user-triggered event
            await this.initializeModelManager();

            // Get current selection state and send appropriate message
            const selectedItems = viewport.getSelectedItems();
            await this.handleSelectionChange(selectedItems);
        } catch (error) {
            this.handleError('Error during React ready initialization:', error);
        }
    }
    /**
     * Handles page conversion request
     */
    private async handlePageConvertRequest(): Promise<void> {
        this.log('Handling convert request');

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            this.sendTypedMessage(MessageTypes.CONVERSION_ERROR, {
                error: 'No active page found'
            });
            return;
        }

        try {

            this.log('Creating dataProxy');
            const dataProxy = new DataProxy(this.client);
            this.log('Creating modelDataSource');
            const modelDataSource = new ModelDataSource(dataProxy);
            this.log('Creating pageSchemaConversionService');
            const pageSchemaConversionService = new PageSchemaConversionService(modelDataSource);
            this.log('pageSchemaConversionService.convertPage');


            // const result2 = await pageSchemaConversionService.convertPage(currentPage);

            const storageAdapter = new StorageAdapter();
            const lucidElementFactory = new LucidElementFactory(storageAdapter)
            const lucidPageConversionService = new LucidPageConversionService(this.modelManager, lucidElementFactory, storageAdapter)
            lucidPageConversionService.convertPage(currentPage)


            const selectedItems = viewport.getSelectedItems();
            await this.handleSelectionChange(selectedItems);

        } catch (error) {
            this.logError('Conversion error:', error);
            this.sendTypedMessage(MessageTypes.CONVERSION_ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handles element data update
     */
    private async handleUpdateElementData(
        updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]
    ): Promise<void> {
        this.log('Received element update data:', updateData);

        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                throw new Error('No active page found');
            }
            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();
            if (updateData.type == 'Model') {
                this.log('Received element type of Model:', updateData.type);
                this.modelManager.setElementData(
                    currentPage,
                    updateData.data,
                    SimulationObjectType.Model
                );

                // this.modelManager.updateElement({
                //     id: currentPage.id,
                //     type: SimulationObjectType.Model,
                //     ...updateData.data
                // });
            }
            else {

                // Update current selection first
                this.currentSelection = {
                    pageId: currentPage.id,
                    selectedIds: selectedItems.map(item => item.id),
                    selectionType: this.currentSelection.selectionType
                };

                const element = selectedItems.find(item => item.id === updateData.elementId);
                if (!element) {
                    throw new Error(`Element not found in selection: ${updateData.elementId}`);
                }

                // Save element data using ModelManager
                await this.modelManager.saveElementData(
                    element,
                    updateData.data,
                    updateData.type,
                    currentPage
                );
            }

            // Send success message
            this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                elementId: updateData.elementId
            });
            // Debug logging
            this.log('Debug - Selection state:', {
                currentSelectionIds: this.currentSelection.selectedIds,
                updatedElementId: updateData.elementId,
                isElementInSelection: this.currentSelection.selectedIds.includes(updateData.elementId),
                selectedItems: selectedItems.map(item => item.id)
            });
            // Update validation and selection state
            await this.modelManager.validateModel();

            // Only update selection if this element is selected
            if (this.currentSelection.selectedIds.includes(updateData.elementId)) {
                await this.handleSelectionChange(selectedItems);
            }

        } catch (error) {
            this.logError('Error updating element:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to update element: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    private async handleSimulateModel(): Promise<void> {
        this.log('Handling simulate model request');

        try {
            // Get the document ID using DocumentProxy
            const documentId = new DocumentProxy(this.client).id;
            const viewport = new Viewport(this.client);
            const userId = new UserProxy(this.client).id;
            // const activePageProxy = viewport.getCurrentPage();
            const activePageProxy: PageProxy | null | undefined = viewport.getCurrentPage();

            let pageId: string = 'undefined';

            if (activePageProxy) {
                pageId = activePageProxy.id;
            }
            else {
                this.log('No active page');
                this.sendTypedMessage(MessageTypes.ERROR, {
                    error: `Failed to start simulation: No active page`
                });
                return;
            }


            this.log(`Extension: docId=${documentId}, pageId=${pageId}, userId=${userId}`);

            const modelDefinition = await this.modelManager.getModelDefinition();
            if (modelDefinition) {
                const serializer = ModelSerializerFactory.create(modelDefinition);

                // Attempt serialization
                const serializedModel = serializer.serialize(modelDefinition);
                this.log('serializedModel:', JSON.stringify(serializedModel));

                // Trigger simulation using the data connector
                await this.client.performDataAction({
                    dataConnectorName: 'quodsi_data_connector',
                    actionName: 'SaveAndSubmitSimulation',
                    actionData: { 'documentId': documentId, scenarioId: BASELINE_SCENARIO_ID, 'model': serializedModel },
                    asynchronous: true
                });
                // Send success message back to React app
                this.sendTypedMessage(MessageTypes.SIMULATION_STARTED, {
                    documentId: documentId
                });
            }
        } catch (error) {
            this.logError('Error starting simulation:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    /**
     * Handles model validation request
     */
    private async handleValidateModel(): Promise<void> {
        this.log('Handling validate model');

        const validationResult = await this.modelManager.validateModel();
        this.log('validationResult:', validationResult);
        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);

        // If validation succeeded, try to serialize
        if (validationResult.isValid || !validationResult.isValid) {
            try {
                // Get the model definition from the model manager
                const modelDefinition = await this.modelManager.getModelDefinition();

                if (modelDefinition) {
                    // Create a serializer using the factory (will use latest version by default)
                    const serializer = ModelSerializerFactory.create(modelDefinition);

                    // Attempt serialization
                    const serializedModel = serializer.serialize(modelDefinition);
                    this.log('serializedModel:', serializedModel);

                    try {
                        // Prepare the request payload
                        const document = new DocumentProxy(this.client);
                        const documentId = document.id;
                        const viewport = new Viewport(this.client);
                        const user: UserProxy = new UserProxy(this.client);
                        // const activePageProxy = viewport.getCurrentPage();
                        const activePageProxy: PageProxy | null | undefined = viewport.getCurrentPage();
                        let pageId: string = 'undefined';
                        let userId: string = 'undefined';
                        if (user) {
                            userId = user.id;
                        }

                        if (activePageProxy) {
                            pageId = activePageProxy.id;
                        }

                        // Make the request to upload the model definition
                        await this.client.performDataAction({
                            dataConnectorName: 'quodsi_data_connector',
                            actionName: 'UploadModelDefinition',
                            actionData: { documentId: documentId, scenarioId: BASELINE_SCENARIO_ID, model: serializedModel },
                            asynchronous: true
                        });

                        // Send a message to the React app about the successful upload
                        // this.sendTypedMessage(MessageTypes.MODEL_UPLOAD_SUCCESS, {
                        //     blobUrl: response.data.blobUrl,
                        //     uploadDateTime: response.data.uploadDateTime,
                        //     batchJob: response.data.batchJob
                        // });

                    } catch (uploadError) {
                        this.log('Model upload failed:', uploadError);

                        // Send error message to the React app
                        // this.sendTypedMessage(MessageTypes.MODEL_UPLOAD_ERROR, {
                        //     error: uploadError.message || 'Failed to upload model'
                        // });
                    }

                    // Log success of serialization
                    this.log('Model serialization successful');

                } else {
                    this.log('No model definition available');
                }
            } catch (error) {
                // Handle serialization errors
                this.log('Model serialization failed:', error);
            }
        }
    }
    /**
     * Handles model saved message
     */
    private handleModelSaved(data: any): void {
        this.log('Handling model saved');

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (currentPage) {
            try {
                this.modelManager.setElementData(
                    currentPage,
                    data,
                    SimulationObjectType.Model
                );

                this.modelManager.updateElement({
                    id: currentPage.id,
                    type: SimulationObjectType.Model,
                    ...data
                });

                this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                    elementId: currentPage.id
                });
            } catch (error) {
                this.sendTypedMessage(MessageTypes.ERROR, {
                    error: `Failed to save model: ${error}`
                });
            }
        }
    }

    protected sendTypedMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): void {
        const message = {
            messagetype: type,
            data: payload ?? null
        } as JsonSerializable;

        this.sendMessage(message);
    }

    // Message frame handling
    protected messageFromFrame(message: any): void {
        if (!isValidMessage(message)) {
            this.logError('Invalid message format:', message);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'Invalid message format'
            });
            return;
        }

        this.messaging.handleIncomingMessage(message);
    }


}