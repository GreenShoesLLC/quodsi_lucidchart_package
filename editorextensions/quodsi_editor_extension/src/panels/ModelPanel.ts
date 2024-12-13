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
    JsonObject as LucidJsonObject
} from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { StorageAdapter } from '../core/StorageAdapter';
import { ElementData, ExtensionMessaging, JsonSerializable, MessagePayloads, MessageTypes, ModelElement, ModelStructure, isValidMessage } from '@quodsi/shared';
import { JsonObject as SharedJsonObject } from '@quodsi/shared';
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
import { BasePanel } from './BasePanel';


type ComponentOperation = {
    type: MessageTypes.ACTIVITY_SAVED | MessageTypes.CONNECTOR_SAVED |
    MessageTypes.ENTITY_SAVED | MessageTypes.GENERATOR_SAVED |
    MessageTypes.RESOURCE_SAVED;
    objectType: SimulationObjectType;
};

export class ModelPanel extends BasePanel {
    private modelManager: ModelManager;
    private storageAdapter: StorageAdapter;
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
        this.modelManager = modelManager;
        this.storageAdapter = new StorageAdapter();
        this.conversionService = new ConversionService(this.modelManager, this.storageAdapter);
        this.initializeModelManager();
        this.setupModelMessageHandlers();

        console.log('[ModelPanel] Initialized');
    }


    private setupModelMessageHandlers(): void {
        // React App Ready - already handled by BasePanel
        // We can add additional React ready handling if needed
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            if (!this.reactAppReady) {
                console.log('[ModelPanel] Handling additional React ready setup');
                this.handleModelSpecificReactReady();
            }
        });

        // Model Operations
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
    }

    private handleModelSpecificReactReady(): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            console.error('[ModelPanel] No active page found during React ready');
            return;
        }

        const isModel = this.storageAdapter.isQuodsiModel(currentPage);
        this.sendInitialState(currentPage, isModel, document.id);

        if (this.currentSelection.selectedIds.length > 0) {
            this.sendSelectionUpdate();
        }
    }

    /**
         * Updates the model structure based on current model data and validates the model
         */
    private async updateModelStructure(): Promise<void> {
        const modelData = this.modelManager.getModelDefinition();
        if (modelData) {
            // Update model structure
            this.currentModelStructure = ModelStructureBuilder.buildModelStructure(modelData);
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



    private async initializeModelManager(): Promise<void> {
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
            await this.modelManager.validateModel();
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

    async handleValidateRequest(): Promise<void> {
        const validationResult = await this.modelManager.validateModel();

        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
    }
    /**
     * Handles selection changes in the editor
     */
    /**
     * Handles selection changes in the editor
     */
    public async handleSelectionChange(items: ItemProxy[]): Promise<void> {
        this.isHandlingSelectionChange = true;
        try {
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

            await this.updateModelStructure();

            // Update current selection state
            this.updateSelectionState(currentPage, items);

            // Only send updates if React app is ready
            if (this.reactAppReady) {
                let elementData: ElementData[] = [];

                if (items.length === 0) {
                    if (this.storageAdapter.isQuodsiModel(currentPage)) {
                        const rawModelData = this.storageAdapter.getElementData(currentPage);
                        if (typeof rawModelData === 'object' && rawModelData !== null) {
                            const modelData = JSON.parse(JSON.stringify(rawModelData)) as SharedJsonObject;
                            console.log('[ModelPanel] Page model data:', modelData);

                            elementData = [{
                                id: currentPage.id,
                                data: modelData,
                                metadata: {
                                    type: SimulationObjectType.Model,
                                    version: this.storageAdapter.CURRENT_VERSION
                                },
                                name: currentPage.getTitle() || null
                            }];
                        }
                    }
                } else {
                    elementData = items.map(item => {
                        const rawData = this.storageAdapter.getElementData(item);
                        // Convert SDK JsonObject to our SharedJsonObject type
                        const data = (typeof rawData === 'object' && rawData !== null) ?
                            JSON.parse(JSON.stringify(rawData)) as SharedJsonObject : {};

                        const metadata = this.storageAdapter.getMetadata(item);
                        // Convert metadata in the same way if needed
                        const convertedMetadata = metadata ?
                            JSON.parse(JSON.stringify(metadata)) : null;

                        return {
                            id: item.id,
                            data: data,
                            metadata: convertedMetadata,
                            name: 'TBD'
                        };
                    });
                }

                // Get the validation result from modelManager
                const validationResult = this.modelManager.getCurrentValidation();

                // Send selection update with element data, model structure, and validation result
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                    selectionState: this.currentSelection,
                    elementData: elementData,
                    modelStructure: this.currentModelStructure,
                    expandedNodes: Array.from(this.expandedNodes),
                    validationResult: validationResult ?? undefined  // Convert null to undefined
                });

                console.log('[ModelPanel] Selection update sent:', {
                    selectionState: this.currentSelection,
                    elementData: elementData,
                    validationState: validationResult
                });
            }
        } catch (error) {
            console.error('[ModelPanel] Error handling selection change:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            this.isHandlingSelectionChange = false;
        }
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

    // Override the hook for additional React ready handling
    protected handleAdditionalReactReady(): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            console.error('[ModelPanel] No active page found during React ready');
            return;
        }

        const isModel = this.storageAdapter.isQuodsiModel(currentPage);
        this.sendInitialState(currentPage, isModel, document.id);

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
                const rawElementData = this.storageAdapter.getElementData(element);
                const rawMetadata = this.storageAdapter.getMetadata(element);
                const referenceData: EditorReferenceData = {};

                // Convert raw data to SharedJsonObject
                const elementData = typeof rawElementData === 'object' && rawElementData !== null ?
                    JSON.parse(JSON.stringify(rawElementData)) as SharedJsonObject : {};

                // Convert metadata to SharedJsonObject
                const metadata = rawMetadata ?
                    JSON.parse(JSON.stringify(rawMetadata)) as SharedJsonObject : null;

                // Build reference data based on element type
                if (rawMetadata?.type === SimulationObjectType.Generator) {
                    const modelDef = this.modelManager.getModelDefinition();
                    if (modelDef) {
                        referenceData.entities = modelDef.entities.getAll().map(e => ({
                            id: e.id,
                            name: e.name
                        }));
                    }
                }

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
    private async handleUpdateElementData(updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]): Promise<void> {
    // ... existing code ...
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
                await this.modelManager.validateModel();
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
            if (typeof updateData.data === 'object' && updateData.data !== null) {
                const elementData = {
                    id: updateData.elementId,
                    type: updateData.type,
                    ...updateData.data as SharedJsonObject,
                    name: 'tbd'
                };
                this.modelManager.registerElement(elementData, element);
                console.log('[ModelPanel] Element registered with model manager');

                // Update storage
                const storageData = {
                    id: updateData.elementId,  // Add the id to the data
                    ...updateData.data as SharedJsonObject
                };
                this.storageAdapter.setElementData(
                    element,
                    storageData,
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
            } else {
                throw new Error('Invalid update data: data must be an object');
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