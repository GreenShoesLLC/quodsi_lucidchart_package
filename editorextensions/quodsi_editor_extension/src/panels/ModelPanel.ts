// panels/ModelPanel.ts
import {
    PanelLocation,
    EditorClient,
    ItemProxy,
    PageProxy,
    Viewport,
    BlockProxy,
    LineProxy,
    DocumentProxy,
    ElementProxy,
    JsonObject as LucidJsonObject,
    Panel
} from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { ElementData, ExtensionMessaging, isValidMessage, JsonSerializable, MessagePayloads, MessageTypes, MetaData, ModelElement, ModelStructure } from '@quodsi/shared';
import { JsonObject as SharedJsonObject } from '@quodsi/shared';
import { SelectionType } from '@quodsi/shared';
import { ConversionService } from '../services/conversion/ConversionService';


import { Model } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';
import { SelectionState } from '@quodsi/shared';
import { EditorReferenceData } from '@quodsi/shared';
import { ModelStructureBuilder } from '../services/accordion/ModelStructureBuilder';
import { SelectionManager, TreeStateManager } from '../managers';

type ComponentOperation = {
    type: MessageTypes.ACTIVITY_SAVED | MessageTypes.CONNECTOR_SAVED |
    MessageTypes.ENTITY_SAVED | MessageTypes.GENERATOR_SAVED |
    MessageTypes.RESOURCE_SAVED;
    objectType: SimulationObjectType;
};

export class ModelPanel extends Panel {
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
        // Replace super() with direct Panel construction
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });

        // Initialize messaging
        this.messaging = ExtensionMessaging.getInstance();

        console.error('[ModelPanel] Constructor called');
        this.modelManager = modelManager;
        this.selectionManager = new SelectionManager(modelManager);
        this.treeStateManager = new TreeStateManager(modelManager);
        this.conversionService = new ConversionService(this.modelManager);
        this.initializeModelManager();
        this.setupModelMessageHandlers();

        console.log('[ModelPanel] Initialized');
    }

    private static readonly logger = (() => {
        console.error('[ModelPanel] Class definition loaded');
        return true;
    })();

    private setupModelMessageHandlers(): void {
        console.error('[ModelPanel] Setting up message handlers START');
        // React App Ready - already handled by BasePanel

        // Model Operations
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            console.error('[ModelPanel] REACT_APP_READY message received in handler');
            this.handleReactReady();
        });
        // Setup error handler
        this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
            console.error('[ModelPanel] Error received:', payload);
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

        console.error('[ModelPanel] Setting up message handlers END');
    }


    /**
         * Updates the model structure based on current model data and validates the model
         */
    private async updateModelStructure(): Promise<void> {

        const modelDef = await this.modelManager.getModelDefinition();
        if (modelDef) {
            // Update model structure
            this.currentModelStructure = ModelStructureBuilder.buildModelStructure(modelDef);
            console.log('[ModelPanel] Model structure updated:', this.currentModelStructure);

            // Validate model
            const validationResult = await this.modelManager.validateModel();
            console.log('[ModelPanel] Model validation result:', validationResult);

            // If we're in a selection change context, this validation result will be used
            // Otherwise, notify the React app of the validation update
            if (!this.isHandlingSelectionChange) {
                this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
            }
        } else {
            this.currentModelStructure = undefined;
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
        console.log('[ModelPanel] Tree state update:', { expandedNodes });
        this.expandedNodes = new Set(expandedNodes);

        // Get current page and save to storage
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (currentPage) {
            console.log('[ModelPanel] Saving expanded nodes to storage:', expandedNodes);
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
            console.log('[ModelPanel] Page is not a Quodsi model, skipping initialization');
            return;
        }

        try {
            const modelData = this.modelManager.getElementData<Model>(currentPage);
            if (modelData) {
                await this.modelManager.initializeModel(modelData, currentPage);
                console.log('[ModelPanel] Model initialization complete');
            }
        } catch (error) {
            console.error('[ModelPanel] Error initializing model:', error);
            throw new Error(`Failed to initialize model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Shows the panel
     */
    public show(): void {
        console.log('[ModelPanel] Show called');
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        console.log('[ModelPanel] Current page at show:', currentPage);

        this.initializeModelManager(); // Re-initialize when panel is shown
        super.show();
    }

    /**
     * Hides the panel
     */
    public hide(): void {
        console.log('[ModelPanel] Hide called');
        super.hide();
    }

    async handleValidateRequest(): Promise<void> {
        const validationResult = await this.modelManager.validateModel();

        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
    }

    /**
     * Handles selection changes in the editor
     */
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
                await this.sendSelectionUpdateToReact(items, currentPage);
            }
        } catch (error) {
            this.handleError('Error handling selection change:', error);
        } finally {
            this.isHandlingSelectionChange = false;
        }
    }
    private async sendSelectionUpdateToReact(items: ItemProxy[], currentPage: PageProxy): Promise<void> {
        const elementData = await this.buildElementData(items, currentPage);
        const validationResult = this.modelManager.getCurrentValidation();

        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
            selectionState: this.selectionManager.getCurrentSelection(),
            elementData: elementData,
            modelStructure: this.currentModelStructure,
            expandedNodes: this.treeStateManager.getExpandedNodes(),
            validationResult: validationResult ?? undefined
        });
    }
    private async buildElementData(items: ItemProxy[], currentPage: PageProxy): Promise<ElementData[]> {
        if (items.length === 0) {
            return this.buildModelElementData(currentPage);
        }
        return this.buildSelectedElementsData(items);
    }
    private handleError(message: string, error: any): void {
        console.error(`[ModelPanel] ${message}`, error);
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
    // Add these methods to the ModelPanel class

    private async buildModelElementData(currentPage: PageProxy): Promise<ElementData[]> {
        if (!this.modelManager.isQuodsiModel(currentPage)) {
            return [];
        }

        const rawModelData = this.modelManager.getElementData(currentPage);
        if (typeof rawModelData !== 'object' || rawModelData === null) {
            return [];
        }

        const modelData = JSON.parse(JSON.stringify(rawModelData)) as SharedJsonObject;

        return [{
            id: currentPage.id,
            data: modelData,
            metadata: {
                type: SimulationObjectType.Model,
                version: this.modelManager.CURRENT_VERSION,
                id: currentPage.id,
                lastModified: new Date().toISOString(),
            },
            name: currentPage.getTitle() || 'Untitled Model'
        }];
    }

    private async buildSelectedElementsData(items: ItemProxy[]): Promise<ElementData[]> {
        return Promise.all(items.map(async item => {
            const rawData = this.modelManager.getElementData(item);
            const data = (typeof rawData === 'object' && rawData !== null) ?
                JSON.parse(JSON.stringify(rawData)) as SharedJsonObject : {};

            const metadata = await this.modelManager.getMetadata(item) || {};
            const convertedMetadata = JSON.parse(JSON.stringify(metadata));

            // Add isUnconverted flag for unconverted elements
            if (this.selectionManager.getCurrentSelection().selectionType === SelectionType.UNCONVERTED_ELEMENT) {
                convertedMetadata.isUnconverted = true;
                convertedMetadata.originalType = item instanceof BlockProxy ? 'block' : 'line';
            }

            // Get element name based on type
            let elementName = 'Unnamed Element';
            if (item instanceof BlockProxy) {
                elementName = 'Unnamed Block';
            } else if (item instanceof LineProxy) {
                elementName = 'Unnamed Connector';
            }

            return {
                id: item.id,
                data: {
                    ...data,
                    id: item.id,
                    name: elementName // Include name in data for consistency
                },
                metadata: convertedMetadata,
                name: elementName
            };
        }));
    }
    /**
     * Handles model removal request
     */
    private handleRemoveModel(): void {
        console.log('[ModelPanel] Handling remove model request');

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'No active page found'
            });
            return;
        }

        try {
            // Use ModelManager to remove the model
            this.modelManager.removeModelFromPage(currentPage);

            // Notify React app of successful removal
            this.sendTypedMessage(MessageTypes.MODEL_REMOVED);

            // Refresh the panel state after removal
            this.sendInitialState(currentPage, false, document.id);

        } catch (error) {
            console.error('[ModelPanel] Model removal error:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    // Override the hook for additional React ready handling
    private handleReactReady(): void {
        if (this.reactAppReady) {
            console.error('[ModelPanel] React app already ready, skipping initialization');
            return;
        }

        console.error('[ModelPanel] handleReactReady');
        this.reactAppReady = true;

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            console.error('[ModelPanel] No active page found during React ready');
            return;
        }

        const isModel = this.modelManager.isQuodsiModel(currentPage);
        this.sendInitialState(currentPage, isModel, document.id);

        // Update this section to use sendSelectionUpdateToReact instead
        if (this.currentSelection.selectedIds.length > 0) {
            const selectedItems = viewport.getSelectedItems();
            this.sendSelectionUpdateToReact(selectedItems, currentPage).catch(error =>
                this.handleError('Error sending selection update:', error)
            );
        }
    }
    /**
     * Sends initial state to React app
     */
    private sendInitialState(page: PageProxy, isModel: boolean, documentId: string): void {
        console.log('[ModelPanel] Sending initial state with full details:', {
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
        console.log('[ModelPanel] Loaded expanded nodes from storage:', savedExpandedNodes);
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
     * Sends selection update to React app
     */
    // private sendSelectionUpdate(): void {
    //     console.log('[ModelPanel] Sending selection update');

    //     this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
    //         selectionState: this.currentSelection,
    //         elementData: this.buildSelectedElementsData()
    //     });
    // }

    /**
     * Gets data for selected elements
     */
    // private getSelectedElementsData(): any {
    //     const viewport = new Viewport(this.client);
    //     const selectedItems = viewport.getSelectedItems();

    //     return selectedItems.map(item => ({
    //         id: item.id,
    //         data: this.modelManager.getElementData(item),
    //         metadata: this.modelManager.getMetadata(item)
    //     }));
    // }

    /**
     * Handles page conversion request
     */
    private async handleConvertRequest(): Promise<void> {
        console.log('[ModelPanel] Handling convert request');

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);
        const documentId = document.id;

        if (!currentPage) {
            this.sendTypedMessage(MessageTypes.CONVERSION_ERROR, {
                error: 'No active page found'
            });
            return;
        }

        try {
            this.sendTypedMessage(MessageTypes.CONVERSION_STARTED);

            const result = await this.conversionService.convertPage(currentPage);

            this.sendTypedMessage(MessageTypes.CONVERSION_COMPLETE, result);

            // Refresh the panel state after conversion
            this.sendInitialState(currentPage, true, documentId);
        } catch (error) {
            console.error('[ModelPanel] Conversion error:', error);
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
            console.error('[ModelPanel] Element not found:', elementId);
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
        console.log('[ModelPanel] Received element update data:', updateData);

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
            console.error('[ModelPanel] Error updating element:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to update element: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    /**
     * Handles model validation request
     */
    private async handleValidateModel(): Promise<void> {
        console.log('[ModelPanel] Handling validate model');

        const validationResult = await this.modelManager.validateModel();

        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
    }
    /**
     * Handles model saved message
     */
    private handleModelSaved(data: any): void {
        console.log('[ModelPanel] Handling model saved');

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

    /**
     * Handles element saved message
     */
    private handleElementSaved(data: {
        elementId: string,
        data: any,
        type: SimulationObjectType
    }): void {
        console.log('[ModelPanel] Handling element saved:', data);
        // Reuse the update logic since it's essentially the same operation
        this.handleUpdateElementData({
            elementId: data.elementId,
            data: data.data,
            type: data.type
        });
    }

    /**
     * Finds an element by ID
     */
    private findElementById(id: string): ElementProxy | PageProxy | null {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (!currentPage) return null;

        // First check if the ID matches the page itself
        if (id === currentPage.id) {
            return currentPage;
        }
        // Log available elements for debugging
        console.log('[ModelPanel] Looking for element:', id);
        console.log('[ModelPanel] Available blocks:', Array.from(currentPage.allBlocks.keys()));
        console.log('[ModelPanel] Available lines:', Array.from(currentPage.allLines.keys()));

        // Check blocks first
        for (const [blockId, block] of currentPage.allBlocks) {
            if (blockId === id) {
                console.log('[ModelPanel] Found element in blocks:', blockId);
                return block;
            }
        }

        // Check lines next
        for (const [lineId, line] of currentPage.allLines) {
            if (lineId === id) {
                console.log('[ModelPanel] Found element in lines:', lineId);
                return line;
            }
        }

        // If element not found, log more details
        console.warn('[ModelPanel] Element not found:', {
            searchId: id,
            pageId: currentPage.id,
            blockCount: currentPage.allBlocks.size,
            lineCount: currentPage.allLines.size
        });

        return null;
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
            console.error('[ModelPanel] Invalid message format:', message);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'Invalid message format'
            });
            return;
        }

        this.messaging.handleIncomingMessage(message);
    }
}