// panels/ModelPanel.ts
import {
    Panel,
    PanelLocation,
    EditorClient,
    ItemProxy,
    PageProxy,
    Viewport,
    BlockProxy,
    LineProxy,
    DocumentProxy,
    ElementProxy
} from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { StorageAdapter } from '../core/StorageAdapter';
import { MessagePayloads, MessageTypes, ModelElement, ModelStructure, isValidMessage } from '@quodsi/shared';

import { SelectionType } from '@quodsi/shared';
import { ConversionService } from '../services/conversion/ConversionService';
import { RemoveModelFromPage } from '../services/conversion/RemoveModelFromPage';

import { Model } from '@quodsi/shared';
import { Activity } from '@quodsi/shared';
import { Connector } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';
import { SimulationElementFactory } from '@quodsi/shared';
import { SelectionState } from '@quodsi/shared';
import { EditorReferenceData } from '@quodsi/shared';
import { ModelStructureBuilder } from '../services/accordion/ModelStructureBuilder';


/**
 * Helper function to create a serializable message
 */
function createSerializableMessage<T extends MessageTypes>(
    type: T,
    data?: any
): { [key: string]: any } {
    return {
        messagetype: type,
        data: data ?? null
    };
}

export class ModelPanel extends Panel {
    private reactAppReady: boolean = false;
    private storageAdapter: StorageAdapter;
    private conversionService: ConversionService;
    private expandedNodes: Set<string> = new Set();
    private currentModelStructure?: ModelStructure = undefined;
    private currentSelection: SelectionState = {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
    };

    constructor(
        client: EditorClient,
        private modelManager: ModelManager
    ) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });

        this.storageAdapter = new StorageAdapter();
        this.conversionService = new ConversionService(this.modelManager, this.storageAdapter);
        this.initializeModelManager();

        console.log('[ModelPanel] Initialized');
    }

    /**
     * Updates the model structure based on current model data
     */
    private updateModelStructure(): void {
        const modelData = this.modelManager.getModelDefinition();
        if (modelData) {
            this.currentModelStructure = ModelStructureBuilder.buildModelStructure(modelData);
            console.log('[ModelPanel] Model structure updated:', this.currentModelStructure);
        } else {
            this.currentModelStructure = undefined;
        }
    }

    /**
     * Handles tree node expansion state changes
     */
    private handleTreeNodeToggle(nodeId: string, expanded: boolean): void {
        if (expanded) {
            this.expandedNodes.add(nodeId);
        } else {
            this.expandedNodes.delete(nodeId);
        }

        this.sendTreeStateUpdate();
    }

    /**
     * Handles bulk tree state updates
     */
    private handleTreeStateUpdate(expandedNodes: string[]): void {
        this.expandedNodes = new Set(expandedNodes);
        this.sendTreeStateUpdate();
    }

    /**
     * Expands the path to a specific node
     */
    private handleExpandPath(nodeId: string): void {
        if (!this.currentModelStructure) return;

        const findPathToNode = (elements: ModelElement[], targetId: string, path: Set<string>): boolean => {
            for (const element of elements) {
                if (element.id === targetId) {
                    return true;
                }
                if (element.children?.length) {
                    if (findPathToNode(element.children, targetId, path)) {
                        path.add(element.id);
                        return true;
                    }
                }
            }
            return false;
        };

        const pathNodes = new Set<string>();
        findPathToNode(this.currentModelStructure.elements, nodeId, pathNodes);

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



    private initializeModelManager(): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (!currentPage || !this.storageAdapter.isQuodsiModel(currentPage)) {
            console.log('[ModelPanel] Page is not a Quodsi model, skipping initialization');
            return;
        }
        else {
            console.log('[ModelPanel] Page is a Quodsi model, starting initialization');
        }

        try {
            // Load page/model data
            const modelData = this.storageAdapter.getElementData<Model>(currentPage);
            if (modelData) {
                console.log('[ModelPanel] Creating model element with:', {
                    metadataType: SimulationObjectType.Model,
                    modelData: modelData
                });

                try {
                    const modelElement = SimulationElementFactory.createElement(
                        { type: SimulationObjectType.Model },
                        modelData
                    );

                    console.log('[ModelPanel] Created model element:', {
                        elementType: modelElement.type,
                        elementId: modelElement.id,
                        elementStructure: modelElement
                    });

                    this.modelManager.registerElement(modelElement, currentPage);
                    console.log('[ModelPanel] Successfully registered model element');
                } catch (createError) {
                    console.error('[ModelPanel] Error creating model element:', {
                        error: createError,
                        modelData: modelData,
                        stack: createError instanceof Error ? createError.stack : undefined
                    });
                    throw createError;
                }
            }

            // Load blocks (activities, resources, generators, entities)
            for (const [blockId, block] of currentPage.allBlocks) {
                const metadata = this.storageAdapter.getMetadata(block);
                if (!metadata) {
                    console.log('[ModelPanel] No metadata found for block:', block.id);
                    continue;
                }

                const blockData = this.storageAdapter.getElementData<Activity>(block);
                if (blockData) {
                    const element = SimulationElementFactory.createElement(metadata, blockData);
                    this.modelManager.registerElement(element, block);
                    console.log('[ModelPanel] Registered block element:', {
                        id: element.id,
                        type: element.type
                    });
                }
            }

            // Load lines (connectors)
            for (const [lineId, line] of currentPage.allLines) {
                const metadata = this.storageAdapter.getMetadata(line);
                if (!metadata) {
                    console.log('[ModelPanel] No metadata found for line:', line.id);
                    continue;
                }

                const lineData = this.storageAdapter.getElementData<Connector>(line);
                if (lineData) {
                    const element = SimulationElementFactory.createElement(metadata, lineData);
                    this.modelManager.registerElement(element, line);
                    console.log('[ModelPanel] Registered connector element:', {
                        id: element.id,
                        type: element.type
                    });
                }
            }

            console.log('[ModelPanel] Model initialization complete');
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

    /**
     * Handles selection changes in the editor
     */
    public handleSelectionChange(items: ItemProxy[]): void {
        console.log('[ModelPanel] Selection changed:', {
            count: items.length,
            ids: items.map(item => item.id)
        });

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (!currentPage) {
            console.error('[ModelPanel] No active page found');
            return;
        }

        this.updateModelStructure();
        // Update current selection state
        this.updateSelectionState(currentPage, items);

        // Only send updates if React app is ready
        if (this.reactAppReady) {
            interface ElementData {
                id: string;
                data: any;
                metadata?: {
                    type: SimulationObjectType;
                    version: string;
                } | null;
            }

            let elementData: ElementData[] = [];

            if (items.length === 0) {
                // Check if the page is a Quodsi model
                if (this.storageAdapter.isQuodsiModel(currentPage)) {
                    // When nothing is selected and page is a model, get the page's model data
                    const modelData = this.storageAdapter.getElementData(currentPage);
                    console.log('[ModelPanel] Page model data:', modelData);

                    elementData = [{
                        id: currentPage.id,
                        data: modelData,
                        metadata: {
                            type: SimulationObjectType.Model,
                            version: this.storageAdapter.CURRENT_VERSION
                        }
                    }];
                }
            } else {
                // Get full element data for selected items
                elementData = items.map(item => ({
                    id: item.id,
                    data: this.storageAdapter.getElementData(item),
                    metadata: this.storageAdapter.getMetadata(item)
                }));
            }

            // Send selection update with element data
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                selectionState: this.currentSelection,
                elementData: elementData,
                modelStructure: this.currentModelStructure,
                expandedNodes: Array.from(this.expandedNodes)
            });

            console.log('[ModelPanel] Selection update sent:', {
                selectionState: this.currentSelection,
                elementData: elementData
            });
        }
    }

    /**
         * Sends a typed message ensuring it's serializable
         */
    private sendTypedMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): void {
        this.sendMessage(createSerializableMessage(type, payload));
    }

    /**
     * Updates the current selection state
     */
    private updateSelectionState(page: PageProxy, items: ItemProxy[]): void {
        const newState: SelectionState = {
            pageId: page.id,
            selectedIds: items.map(item => item.id),
            selectionType: this.determineSelectionType(items)
        };

        this.currentSelection = newState;
        console.log('[ModelPanel] Selection state updated:', this.currentSelection);
    }

    /**
     * Determines the type of the current selection
     */
    private determineSelectionType(items: ItemProxy[]): SelectionType {
        if (items.length === 0) return SelectionType.NONE;
        if (items.length > 1) return SelectionType.MULTIPLE;

        const item = items[0];

        // Check if item has Quodsi data
        const hasQuodsiData = this.storageAdapter.validateStorage(item);

        // If it's a single item without Quodsi data, return UNCONVERTED_ELEMENT
        if (!hasQuodsiData && (item instanceof BlockProxy || item instanceof LineProxy)) {
            return SelectionType.UNCONVERTED_ELEMENT;
        }

        // Rest of existing logic for items with Quodsi data
        if (item instanceof BlockProxy) {
            const meta = this.storageAdapter.getMetadata(item);
            return meta?.type
                ? this.mapElementTypeToSelectionType(meta.type)
                : SelectionType.UNKNOWN_BLOCK;
        }
        if (item instanceof LineProxy) {
            const meta = this.storageAdapter.getMetadata(item);
            return meta?.type
                ? this.mapElementTypeToSelectionType(meta.type)
                : SelectionType.UNKNOWN_LINE;
        }

        return SelectionType.UNKNOWN_BLOCK;
    }
    /**
         * Maps SimulationObjectType to SelectionType
         */
    private mapElementTypeToSelectionType(elementType: SimulationObjectType): SelectionType {
        switch (elementType) {
            case SimulationObjectType.Activity:
                return SelectionType.ACTIVITY;
            case SimulationObjectType.Connector:
                return SelectionType.CONNECTOR;
            case SimulationObjectType.Entity:
                return SelectionType.ENTITY;
            case SimulationObjectType.Generator:
                return SelectionType.GENERATOR;
            case SimulationObjectType.Resource:
                return SelectionType.RESOURCE;
            case SimulationObjectType.Model:
                return SelectionType.MODEL;
            default:
                return SelectionType.UNKNOWN_BLOCK;
        }
    }
    /**
     * Handles messages from the React app
     */
    protected messageFromFrame(message: any): void {
        console.log('[ModelPanel] Message received:', message);

        if (!isValidMessage(message)) {
            console.error('[ModelPanel] Invalid message format:', message);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'Invalid message format'
            });
            return;
        }

        try {
            switch (message.messagetype) {
                case MessageTypes.REACT_APP_READY:
                    if (this.reactAppReady) {
                        console.log('[ModelPanel] Ignoring duplicate reactAppReady message');
                    }
                    else {
                        this.handleReactReady();
                    }
                    break;
                case MessageTypes.REMOVE_MODEL:
                    this.handleRemoveModel();
                    break;
                case MessageTypes.CONVERT_PAGE:
                    this.handleConvertRequest();
                    break;

                case MessageTypes.GET_ELEMENT_DATA:
                    this.handleGetElementData(message.data?.elementId);
                    break;

                case MessageTypes.UPDATE_ELEMENT_DATA:
                    this.handleUpdateElementData(message.data);
                    break;

                case MessageTypes.VALIDATE_MODEL:
                    this.handleValidateModel();
                    break;

                case MessageTypes.MODEL_SAVED:
                    this.handleModelSaved(message.data);
                    break;
                case MessageTypes.TREE_NODE_TOGGLE:
                    const { nodeId, expanded } = message.data;
                    this.handleTreeNodeToggle(nodeId, expanded);
                    break;

                case MessageTypes.TREE_STATE_UPDATE:
                    this.handleTreeStateUpdate(message.data.expandedNodes);
                    break;

                case MessageTypes.TREE_NODE_EXPAND_PATH:
                    this.handleExpandPath(message.data.nodeId);
                    break;
                case MessageTypes.ACTIVITY_SAVED:
                case MessageTypes.CONNECTOR_SAVED:
                case MessageTypes.ENTITY_SAVED:
                case MessageTypes.GENERATOR_SAVED:
                case MessageTypes.RESOURCE_SAVED:
                    this.handleElementSaved(message.data);
                    break;

                default:
                    console.warn('[ModelPanel] Unknown message type:', message.messagetype);
                    this.sendTypedMessage(MessageTypes.ERROR, {
                        error: `Unknown message type: ${message.messagetype}`
                    });
            }
        } catch (error) {
            console.error('[ModelPanel] Error handling message:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error',
                details: { messageType: message.messagetype }
            });
        }
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
            // Create instance of RemoveModelFromPage
            const remover = new RemoveModelFromPage(currentPage, this.storageAdapter);

            // Remove the model
            remover.removeModel();

            // Clear model manager state
            this.modelManager = new ModelManager(this.storageAdapter);

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

    /**
     * Handles React app ready signal
     */
    private handleReactReady(): void {
        console.log('[ModelPanel] Handling React ready signal');
        this.reactAppReady = true;

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        console.log('[ModelPanel] Current page:', currentPage);
        console.log('[ModelPanel] Document:', document);

        if (!currentPage) {
            console.error('[ModelPanel] No active page found');
            return;
        }

        // Get the current page details
        const pageId = currentPage.id;
        const documentId = document.id;
        const pageTitle = currentPage.getTitle();

        console.log('[ModelPanel] Debug page details:', {
            pageId,
            documentId,
            pageTitle,
            pageProperties: Object.keys(currentPage),
            viewportSelection: viewport.getSelectedItems()
        });

        const isModel = this.storageAdapter.isQuodsiModel(currentPage);

        console.log('[ModelPanel] Sending initial state with:', {
            isModel,
            pageId,
            documentId
        });

        this.sendInitialState(currentPage, isModel, documentId);

        if (this.currentSelection.selectedIds.length > 0) {
            this.sendSelectionUpdate();
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

        // Load saved expanded nodes from storage if available
        const savedExpandedNodes = this.storageAdapter.getExpandedNodes(page);
        if (savedExpandedNodes?.length) {
            this.expandedNodes = new Set(savedExpandedNodes);
        }

        this.sendTypedMessage(MessageTypes.INITIAL_STATE, {
            isModel,
            pageId: page.id,
            documentId,
            canConvert: this.conversionService ? this.conversionService.canConvertPage(page) : false,
            modelData: isModel ? this.storageAdapter.getElementData(page) : null,
            selectionState: this.currentSelection,
            modelStructure: this.currentModelStructure,
            expandedNodes: Array.from(this.expandedNodes)
        });
    }

    /**
     * Sends selection update to React app
     */
    private sendSelectionUpdate(): void {
        console.log('[ModelPanel] Sending selection update');

        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
            selectionState: this.currentSelection,
            elementData: this.getSelectedElementsData()
        });
    }

    /**
     * Gets data for selected elements
     */
    private getSelectedElementsData(): any {
        const viewport = new Viewport(this.client);
        const selectedItems = viewport.getSelectedItems();

        return selectedItems.map(item => ({
            id: item.id,
            data: this.storageAdapter.getElementData(item),
            metadata: this.storageAdapter.getMetadata(item)
        }));
    }

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
    private handleGetElementData(elementId: string): void {
        const element = this.findElementById(elementId);
        if (element) {
            try {
                const elementData = this.storageAdapter.getElementData(element);
                const metadata = this.storageAdapter.getMetadata(element);
                const referenceData: EditorReferenceData = {};

                // Build reference data based on element type
                if (metadata?.type === SimulationObjectType.Generator) {
                    // Include entities list for Generator editor
                    const modelDef = this.modelManager.getModelDefinition();
                    if (modelDef) {
                        referenceData.entities = modelDef.entities.getAll().map(e => ({
                            id: e.id,
                            name: e.name
                        }));
                    }
                }
                // Add similar blocks for other editor types that need reference data

                this.sendTypedMessage(MessageTypes.ELEMENT_DATA, {
                    id: elementId,
                    data: elementData,
                    metadata: metadata,
                    referenceData
                });
            } catch (error) {
                console.error('[ModelPanel] Error getting element data:', error);
                this.sendTypedMessage(MessageTypes.ERROR, {
                    error: `Failed to get element data: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }
    }

    /**
     * Handles element data update
     */
    private handleUpdateElementData(updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]): void {
        console.log('[ModelPanel] Received element update data:', {
            updateData,
            selectedItems: new Viewport(this.client).getSelectedItems().map(item => item.id)
        });

        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                throw new Error('No active page found');
            }

            // Get the currently selected item from viewport
            const selectedItems = viewport.getSelectedItems();
            console.log('[ModelPanel] Selected items:', selectedItems.map(item => item.id));

            const element = selectedItems.find(item => item.id === updateData.elementId);
            if (!element) {
                throw new Error(`Element not found in selection: ${updateData.elementId}`);
            }

            console.log('[ModelPanel] Found element:', {
                id: element.id,
                type: element instanceof BlockProxy ? 'Block' : 'Line'
            });

            // Special handling for NONE type
            if (updateData.type === SimulationObjectType.None) {
                console.log('[ModelPanel] Handling NONE type - clearing element data');

                // Remove from model manager if it exists
                const existingElement = this.modelManager.getElementById(updateData.elementId);
                if (existingElement) {
                    this.modelManager.removeElement(updateData.elementId);
                }

                // Clear storage data
                this.storageAdapter.clearElementData(element);

                // Send success message
                this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                    elementId: updateData.elementId
                });

                // Force a selection update with the new state
                const viewport = new Viewport(this.client);
                const selectedItems = viewport.getSelectedItems();
                this.handleSelectionChange(selectedItems);  // This will update the React app with the new selection state

                return;
            }

            // Regular handling for other types continues below
            // First, ensure model manager is initialized
            if (!this.modelManager.getModel()) {
                console.log('[ModelPanel] Initializing model manager');
                const model = {
                    id: currentPage.id,
                    name: currentPage.getTitle() || 'New Model',
                    type: SimulationObjectType.Model
                };
                this.modelManager.initializeModel(model as Model, currentPage);
            }

            // Then register the element with the model manager
            const elementData = {
                id: updateData.elementId,
                type: updateData.type,
                ...updateData.data
            };
            this.modelManager.registerElement(elementData, element);
            console.log('[ModelPanel] Element registered with model manager');

            // Update storage
            this.storageAdapter.setElementData(
                element,
                updateData.data,
                updateData.type,
                {
                    id: updateData.elementId,
                    version: this.storageAdapter.CURRENT_VERSION
                }
            );
            console.log('[ModelPanel] Storage update successful');

            // Send success message
            this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                elementId: updateData.elementId
            });

            // Refresh selection state if needed
            if (this.currentSelection.selectedIds.includes(updateData.elementId)) {
                this.sendSelectionUpdate();
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
    private handleValidateModel(): void {
        console.log('[ModelPanel] Handling validate model');

        const validationResult = this.modelManager.validateModel();

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
                this.storageAdapter.setElementData(
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
}