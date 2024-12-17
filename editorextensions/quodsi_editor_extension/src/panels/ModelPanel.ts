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
    Panel
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

} from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { ConversionService } from '../services/conversion/ConversionService';
import { SelectionManager, TreeStateManager } from '../managers';


type ComponentOperation = {
    type: MessageTypes.ACTIVITY_SAVED | MessageTypes.CONNECTOR_SAVED |
    MessageTypes.ENTITY_SAVED | MessageTypes.GENERATOR_SAVED |
    MessageTypes.RESOURCE_SAVED;
    objectType: SimulationObjectType;
};

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

    constructor(client: EditorClient, modelManager: ModelManager) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });

        // Initialize services and managers but don't perform any operations yet
        this.messaging = ExtensionMessaging.getInstance();
        this.modelManager = modelManager;
        this.selectionManager = new SelectionManager(modelManager);
        this.treeStateManager = new TreeStateManager(modelManager);
        this.conversionService = new ConversionService(this.modelManager);

        // Set up event handlers
        this.setupModelMessageHandlers();

        // Wait for React app ready message before doing any model operations
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            this.handleReactReady();
        });

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
        // Setup error handler
        this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
            this.logError('Error received:', payload);
        });

        this.messaging.onMessage(MessageTypes.REMOVE_MODEL, () => this.handleRemoveModel());
        this.messaging.onMessage(MessageTypes.CONVERT_PAGE, () => this.handleConvertRequest());
        this.messaging.onMessage(MessageTypes.VALIDATE_MODEL, () => this.handleValidateModel());
        this.messaging.onMessage(MessageTypes.MODEL_SAVED, (data) => this.handleModelSaved(data));

        // Element Operations
        this.messaging.onMessage(MessageTypes.GET_ELEMENT_DATA, (data) =>
            this.handleGetElementData(data.elementId));
        this.messaging.onMessage(MessageTypes.UPDATE_ELEMENT_DATA, (data) =>
            this.handleUpdateElementData(data));

        // Tree State Management
        this.messaging.onMessage(MessageTypes.TREE_NODE_TOGGLE, (data) =>
            this.handleTreeNodeToggle(data.nodeId, data.expanded));
        this.messaging.onMessage(MessageTypes.TREE_STATE_UPDATE, (data) =>
            this.handleTreeStateUpdate(data.expandedNodes));
        this.messaging.onMessage(MessageTypes.TREE_NODE_EXPAND_PATH, (data) =>
            this.handleExpandPath(data.nodeId));

        // Component Operations with type safety
        const componentOperations: ComponentOperation[] = [
            { type: MessageTypes.ACTIVITY_SAVED, objectType: SimulationObjectType.Activity },
            { type: MessageTypes.CONNECTOR_SAVED, objectType: SimulationObjectType.Connector },
            { type: MessageTypes.ENTITY_SAVED, objectType: SimulationObjectType.Entity },
            { type: MessageTypes.GENERATOR_SAVED, objectType: SimulationObjectType.Generator },
            { type: MessageTypes.RESOURCE_SAVED, objectType: SimulationObjectType.Resource }
        ];

        componentOperations.forEach(({ type, objectType }) => {
            this.messaging.onMessage(type, (payload: { elementId: string; data: JsonSerializable }) => {
                this.handleUpdateElementData({
                    elementId: payload.elementId,
                    data: payload.data,
                    type: objectType
                });
            });
        });

        this.logError('Setting up message handlers END');
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

        const basePayload = {
            selectionState,
            modelStructure,
            expandedNodes,
            validationResult
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
                        elementType: item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE
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
                        const modelItemData = await this.buildModelItemData(item);
                        const simulationSelection: SimulationObjectSelectionState = {
                            pageId: currentPage.id,
                            selectedId: item.id,
                            objectType: metadata.type
                        };

                        const payload = {
                            ...basePayload,
                            simulationSelection,
                            modelItemData,
                            modelStructure
                        };
                        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT, payload);
                    }
                }
                break;
            }

            default: {
                // Fallback to legacy selection changed message
                const elementData = await Promise.all(
                    items.map(item => this.buildModelItemData(item))
                );

                const payload = {
                    selectionState,
                    elementData,
                    modelStructure,
                    expandedNodes,
                    validationResult
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, payload);
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

    private handleReactReady(): void {
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

        // Now initialize the model in response to a user-triggered event
        this.initializeModelManager().then(() => {
            const isModel = this.modelManager.isQuodsiModel(currentPage);

            // If not a model, send appropriate message
            if (!isModel) {
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL, {
                    pageId: currentPage.id
                });
                return;
            }

            // Only send initial state and handle selection if it is a model
            this.sendInitialState(currentPage, true, document.id);

            // Update selection using new pattern
            if (this.currentSelection.selectedIds.length > 0) {
                const selectedItems = viewport.getSelectedItems();
                this.handleSelectionChange(selectedItems).catch(error =>
                    this.handleError('Error sending selection update:', error)
                );
            }
        });
    }
    /**
     * Sends initial state to React app
     */
    private sendInitialState(page: PageProxy, isModel: boolean, documentId: string): void {
        this.log('Sending initial state with full details:', {
            isModel,
            pageId: page.id,
            documentId,
            pageTitle: page.getTitle(),
            canConvert: this.conversionService ? this.conversionService.canConvertPage(page) : false,
            hasModelData: isModel ? 'yes' : 'no'
        });
        this.updateModelStructure();

        // Load saved expanded nodes from storage
        const savedExpandedNodes = this.modelManager.getExpandedNodes(page);
        this.log('Loaded expanded nodes from storage:', savedExpandedNodes);
        if (savedExpandedNodes?.length) {
            this.expandedNodes = new Set(savedExpandedNodes);
        }

        this.sendTypedMessage(MessageTypes.INITIAL_STATE, {
            isModel,
            pageId: page.id,
            documentId,
            canConvert: this.conversionService ? this.conversionService.canConvertPage(page) : false,
            modelData: isModel ? this.modelManager.getElementData(page) : null,
            selectionState: this.currentSelection,
            modelStructure: this.currentModelStructure,
            expandedNodes: Array.from(this.expandedNodes)
        });
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

            // this.sendTypedMessage(MessageTypes.CONVERSION_STARTED); --Not implemented in QuodsiApp yet
            const result = await this.conversionService.convertPage(currentPage);
            // this.sendTypedMessage(MessageTypes.CONVERSION_COMPLETE, result);--Not implemented in QuodsiApp yet

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
     * Handles element data request
     */
    private async handleGetElementData(elementId: string): Promise<void> {
        const element = this.client.getElementProxy(elementId);  // or whatever method you currently use

        if (!element) {
            this.logError('Element not found:', elementId);
            return;
        }

        const rawData = this.modelManager.getElementData(element);
        const metadata = this.modelManager.getMetadata(element) || {} as MetaData;

        // Add isUnconverted flag if this element is in our unconverted set
        // Check if element is unconverted
        if (this.modelManager.isUnconvertedElement(element)) {
            metadata.isUnconverted = true;
        }
        const referenceData: EditorReferenceData = {};
        // Build reference data based on element type
        if (metadata?.type === SimulationObjectType.Generator) {
            const modelDef = await this.modelManager.getModelDefinition();
            if (modelDef) {
                referenceData.entities = modelDef.entities.getAll().map(e => ({
                    id: e.id,
                    name: e.name
                }));
            }
        }
        // Use your existing message sending code but include the updated metadata
        this.sendTypedMessage(MessageTypes.ELEMENT_DATA, {
            id: elementId,
            data: rawData as JsonSerializable,
            metadata: metadata,
            referenceData: referenceData
        });
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