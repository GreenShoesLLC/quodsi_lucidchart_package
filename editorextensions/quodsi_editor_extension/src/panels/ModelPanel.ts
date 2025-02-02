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
    DataActionResponse
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
    SimulationObjectTypeFactory

} from '@quodsi/shared';
import { createLucidApiService, parseCsvBlob, calculateTableDimensions } from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { ConversionService } from '../services/conversion/ConversionService';
import { SelectionManager, TreeStateManager } from '../managers';



export class ModelPanel extends Panel {
    private static readonly LOG_PREFIX = '[ModelPanel]';
    private loggingEnabled: boolean = false;
    private selectionManager: SelectionManager;
    private treeStateManager: TreeStateManager;
    private messaging: ExtensionMessaging;
    private reactAppReady: boolean = false;
    private modelManager: ModelManager;
    private conversionService: ConversionService;
    private expandedNodes: Set<string> = new Set();
    private currentModelStructure?: ModelStructure = undefined;
    private currentSelection: SelectionState = {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
    };
    private isHandlingSelectionChange: boolean = false;
    private apiService: any;


    constructor(client: EditorClient, modelManager: ModelManager) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });
        const baseUrl = 'http://localhost:5000/api/';//process.env.REACT_APP_API_URL;
        if (!baseUrl) {
            throw new Error('API URL is not configured');
        }

        this.apiService = createLucidApiService(baseUrl);
        if (!this.apiService) {
            throw new Error('Failed to create API service');
        }
        // Initialize services and managers but don't perform any operations yet
        this.messaging = ExtensionMessaging.getInstance();
        this.modelManager = modelManager;
        this.selectionManager = new SelectionManager(modelManager);
        this.treeStateManager = new TreeStateManager(modelManager);
        this.conversionService = new ConversionService(this.modelManager);

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
        this.messaging.onMessage(MessageTypes.CONVERT_PAGE, () => this.handleConvertRequest());
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


    private async handleOutputCreatePage(data: { pageName: string }): Promise<void> {
        console.log('[ModelPanel] Output page creation requested:', data.pageName);

        try {
            const document = new DocumentProxy(this.client);
            const user = new UserProxy(this.client);
            const docId = document.id;
            const userId = user.id;

            if (!docId || !userId) {
                throw new Error('Document ID or User ID is missing');
            }

            // Create new page
            const def: PageDefinition = {
                title: data.pageName,
            };
            const page = document.addPage(def);
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            // Fetch CSV data using the data connector
            console.log('[ModelPanel] ImportSimulationResults');

            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'ImportSimulationResults',
                actionData: { documentId: docId, userId: userId, pageId: currentPage?.id },
                asynchronous: true
            });
            console.log('[ModelPanel] Successfully called ImportSimulationResults');

        } catch (error) {
            console.error('[ModelPanel] Error creating output page:', error);
            this.messaging.sendMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }


    private async handleOutputCreatePageOld(data: { pageName: string }): Promise<void> {
        console.log('[ModelPanel] Output page creation requested:', data.pageName);

        try {
            const document = new DocumentProxy(this.client);
            const user = new UserProxy(this.client);
            const docId = document.id;
            const userId = user.id;

            if (!docId || !userId) {
                throw new Error('Document ID or User ID is missing');
            }

            // Create new page
            const def: PageDefinition = {
                title: data.pageName,
            };
            const page = document.addPage(def);
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            // Fetch CSV data using the data connector
            console.log('[ModelPanel] Fetching CSV data through performDataAction');

            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'ImportSimulationResults',
                actionData: { documentId: docId, userId: userId, pageId: currentPage?.id },
                asynchronous: true
            });
            const result = { status : 200, json: {error:"blah", csvData: "dan"}}
            console.log('[ModelPanel] GetActivityUtilization', result);
            if (result.status !== 200 || !result.json?.csvData) {
                throw new Error(result.json?.error || 'Failed to fetch CSV data');
            }
            console.log('[ModelPanel]  Parse the CSV string');
            // Parse the CSV string
            console.log('[ModelPanel]  Parse the CSV string');
            const parsedData = await parseCsvBlob(new Blob([result.json.csvData], { type: 'text/csv' }));
            if (!parsedData || !parsedData.length) {
                throw new Error('No data found in CSV');
            }

            // Calculate table dimensions
            console.log('[ModelPanel] Calculating table dimensions...');
            const { width, height } = calculateTableDimensions(parsedData);

            // Load Table block class
            console.log('[ModelPanel] Loading Table block class...');
            await this.client.loadBlockClasses(['TableBlock']);

            // Create table block
            const blockDef: BlockDefinition = {
                className: 'TableBlock',
                boundingBox: {
                    x: 100,
                    y: 100,
                    w: width,
                    h: height
                }
            };
            console.log('[ModelPanel] Adding TableBlock to page...');
            const tableBlock = page.addBlock(blockDef) as TableBlockProxy;

            // Get row and column counts
            const rowCount = parsedData.length;
            const columnCount = parsedData[0]?.length || 0;

            // Get the initial cell to use as reference
            const rows = tableBlock.getRows();
            let lastCell = rows[0].getCells()[0];

            // Add rows as needed
            console.log('[ModelPanel] Adding rows...');
            for (let i = 1; i < rowCount; i++) {
                const newRow = tableBlock.addRow(lastCell);
                lastCell = newRow.getCells()[0];
            }

            // Reset to use first row for column additions
            lastCell = rows[0].getCells()[0];

            // Add columns as needed
            console.log('[ModelPanel] Adding columns...');
            for (let i = 1; i < columnCount; i++) {
                const newColumn = tableBlock.addColumn(lastCell);
                lastCell = newColumn.getCells()[0];
            }

            // Populate table data
            console.log('[ModelPanel] Populating table data...');
            const updatedRows = tableBlock.getRows();
            parsedData.forEach((rowData, rowIndex) => {
                const row = updatedRows[rowIndex];
                const cells = row.getCells();

                rowData.forEach((cellValue, colIndex) => {
                    const cell = cells[colIndex];
                    cell.setText(String(cellValue));

                    // Style header row
                    // if (rowIndex === 0) {
                    //     cell.setBackgroundColor('#f0f0f0');
                    //     cell.setBold(true);
                    // }
                });
            });

            console.log('[ModelPanel] Successfully created output page with data');

        } catch (error) {
            console.error('[ModelPanel] Error creating output page:', error);
            this.messaging.sendMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
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

            // Get model definition from model manager
            const modelDef = await this.modelManager.getModelDefinition();
            if (!modelDef) {
                throw new Error('Model definition not found');
            }

            // Get the appropriate list manager to get the next name
            let nextName: string;
            switch (data.type) {
                case SimulationObjectType.Activity:
                    nextName = modelDef.activities.getNextName();
                    break;
                case SimulationObjectType.Connector:
                    nextName = modelDef.connectors.getNextName();
                    break;
                case SimulationObjectType.Generator:
                    nextName = modelDef.generators.getNextName();
                    break;
                case SimulationObjectType.Resource:
                    nextName = modelDef.resources.getNextName();
                    break;
                case SimulationObjectType.ResourceRequirement:
                    nextName = modelDef.resourceRequirements.getNextName();
                    break;
                case SimulationObjectType.Entity:
                    nextName = modelDef.entities.getNextName();
                    break;
                default:
                    nextName = `New ${data.type}`;
            }

            // Create element with the next name
            const defaultData = SimulationObjectTypeFactory.createElement(data.type, data.elementId);
            defaultData.name = nextName;

            // Save element data using ModelManager
            await this.modelManager.saveElementData(
                element,
                defaultData,
                data.type,
                currentPage
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
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            // Remove the model data from the page
            await this.modelManager.removeModelFromPage(currentPage);

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
    private async handleConvertRequest(): Promise<void> {
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
            const result = await this.conversionService.convertPage(currentPage);
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
            const document = new DocumentProxy(this.client);
            const docId = document.id;
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
            if (activePageProxy) {
                this.log(`Active page ID: ${activePageProxy.id}`);
            } else {
                this.log('No active page found');
            }

            this.log(`Extension: docId=${docId}, pageId=${pageId}, userId=${userId}`);

            // Trigger simulation using the data connector
            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'Simulate',
                actionData: { 'documentId': docId, 'pageId': pageId, 'userId': userId },
                asynchronous: true
            });

            // Send success message back to React app
            this.sendTypedMessage(MessageTypes.SIMULATION_STARTED, {
                documentId: docId
            });

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

        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
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