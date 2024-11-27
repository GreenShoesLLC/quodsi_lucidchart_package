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
    DocumentProxy
} from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { StorageAdapter } from '../core/StorageAdapter';
import { MessagePayloads, MessageTypes, isValidMessage } from '../shared/types/MessageTypes';

import { SelectionState, SelectionType } from '../shared/types/SelectionTypes';
import { ConversionService } from '../services/conversion/ConversionService';
import { RemoveModelFromPage } from '../services/RemoveModelFromPage';

import { Model } from '../shared/types/elements/model';
import { Activity } from '../shared/types/elements/activity';
import { Connector } from '../shared/types/elements/connector';
import { SimulationObjectType } from '../shared/types/elements/enums/simulationObjectType';
import { SimulationElementFactory } from '../shared/types/SimulationElementFactory';


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
        this.initializeModelManager();
        this.conversionService = new ConversionService(this.modelManager, this.storageAdapter);

        console.log('[ModelPanel] Initialized');
    }

    private initializeModelManager(): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (!currentPage || !this.storageAdapter.isQuodsiModel(currentPage)) {
            console.log('[ModelPanel] Page is not a Quodsi model, skipping initialization');
            return;
        }

        try {
            // Load page/model data
            const modelData = this.storageAdapter.getElementData<Model>(currentPage);
            if (modelData) {
                const modelElement = SimulationElementFactory.createElement(
                    { type: SimulationObjectType.Model },
                    modelData
                );
                this.modelManager.registerElement(modelElement);
                console.log('[ModelPanel] Registered model element:', modelElement);
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
                    this.modelManager.registerElement(element);
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
                    this.modelManager.registerElement(element);
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

        // Update current selection state
        this.updateSelectionState(currentPage, items);

        // Only send updates if React app is ready
        if (this.reactAppReady) {
            this.sendSelectionUpdate();
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

        if (!currentPage) {
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'No active page found'
            });
            return;
        }

        try {
            // Create instance of RemoveModelFromPage
            const remover = new RemoveModelFromPage(currentPage);

            // Remove the model
            remover.removeModel();

            // Clear model manager state
            this.modelManager = new ModelManager();

            // Notify React app of successful removal
            this.sendTypedMessage(MessageTypes.MODEL_REMOVED);

            // Refresh the panel state after removal
            const document = new DocumentProxy(this.client);
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
            canConvert: this.conversionService.canConvertPage(page),
            hasModelData: isModel ? 'yes' : 'no'
        });

        this.sendTypedMessage(MessageTypes.INITIAL_STATE, {
            isModel,
            pageId: page.id,
            documentId,
            canConvert: this.conversionService.canConvertPage(page),
            modelData: isModel ? this.storageAdapter.getElementData(page) : null,
            selectionState: this.currentSelection
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
        console.log('[ModelPanel] Handling get element data:', elementId);

        const element = this.findElementById(elementId);

        if (element) {
            this.sendTypedMessage(MessageTypes.ELEMENT_DATA, {
                id: elementId,
                data: this.storageAdapter.getElementData(element),
                metadata: this.storageAdapter.getMetadata(element)
            });
        } else {
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Element not found: ${elementId}`
            });
        }
    }

    /**
     * Handles element data update
     */
    private handleUpdateElementData(updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]): void {
        console.log('[ModelPanel] Handling update element data:', updateData);

        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                throw new Error('No active page found');
            }

            // First try to find the element using stored ID
            let element = this.findElementById(updateData.elementId);

            if (!element) {
                // If not found directly, try to find by iterating through all elements
                for (const [, block] of currentPage.allBlocks) {
                    const meta = this.storageAdapter.getMetadata(block);
                    if (meta && meta.id === updateData.elementId) {
                        element = block;
                        break;
                    }
                }
            }

            if (!element) {
                throw new Error(`Element not found: ${updateData.elementId}`);
            }

            // Update element data
            this.storageAdapter.setElementData(
                element,
                updateData.data,
                updateData.type,
                {
                    id: updateData.elementId,
                    version: this.storageAdapter.CURRENT_VERSION
                }
            );

            // Update model manager
            this.modelManager.updateElement({
                id: updateData.elementId,
                type: updateData.type,
                ...updateData.data
            });

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
    private findElementById(id: string): ItemProxy | null {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (!currentPage) return null;

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