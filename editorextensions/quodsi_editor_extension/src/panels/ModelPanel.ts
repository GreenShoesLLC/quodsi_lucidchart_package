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
import { ElementData, JsonSerializable, MessagePayloads, MessageTypes, MetaData, ModelElement, ModelStructure } from '@quodsi/shared';
import { JsonObject as SharedJsonObject } from '@quodsi/shared';
import { SelectionType } from '@quodsi/shared';
import { ConversionService } from '../services/conversion/ConversionService';


import { Model } from '@quodsi/shared';
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
    private conversionService: ConversionService;
    private expandedNodes: Set<string> = new Set();
    private currentModelStructure?: ModelStructure = undefined;
    private currentSelection: SelectionState = {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
    };
    private isHandlingSelectionChange: boolean = false;
    private unconvertedElements: Set<string> = new Set();

    constructor(client: EditorClient, modelManager: ModelManager) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });
        console.error('[ModelPanel] Constructor called');
        this.modelManager = modelManager;

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
        console.log('[ModelPanel] Tree node toggle:', { nodeId, expanded, currentNodes: this.expandedNodes });
        if (expanded) {
            this.expandedNodes.add(nodeId);
        } else {
            this.expandedNodes.delete(nodeId);
        }

        // Get current page and save to storage
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (currentPage) {
            console.log('[ModelPanel] Saving expanded nodes to storage:', Array.from(this.expandedNodes));
            this.modelManager.setExpandedNodes(currentPage, Array.from(this.expandedNodes));
        }

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
        else {
            console.log('[ModelPanel] Page is a Quodsi model, starting initialization');
        }

        try {
            // Load page/model data
            const modelData = this.modelManager.getElementData<Model>(currentPage)
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
                const metadata = this.modelManager.getMetadata(block);
                if (!metadata) {
                    console.log('[ModelPanel] No metadata found for block:', block.id);
                    continue;
                }

                const blockData = this.modelManager.getElementData(block);
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
                const metadata = this.modelManager.getMetadata(line);
                if (!metadata) {
                    console.log('[ModelPanel] No metadata found for line:', line.id);
                    continue;
                }

                const lineData = this.modelManager.getElementData<Connector>(line);
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

            // First determine the selection state so we can use it for metadata
            const selectionState = await this.determineSelectionState(currentPage, items);
            this.currentSelection = selectionState;

            // Update unconverted elements tracking
            if (selectionState.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
                items.forEach(item => {
                    this.unconvertedElements.add(item.id);
                    console.log('[ModelPanel] Added unconverted element:', item.id);
                });
            } else {
                items.forEach(item => {
                    this.unconvertedElements.delete(item.id);
                    console.log('[ModelPanel] Removed from unconverted elements:', item.id);
                });
            }

            // Only send updates if React app is ready
            if (this.reactAppReady) {
                let elementData: ElementData[] = [];

                if (items.length === 0) {
                    if (this.modelManager.isQuodsiModel(currentPage)) {
                        const rawModelData = this.modelManager.getElementData(currentPage);
                        if (typeof rawModelData === 'object' && rawModelData !== null) {
                            const modelData = JSON.parse(JSON.stringify(rawModelData)) as SharedJsonObject;
                            console.log('[ModelPanel] Page model data:', modelData);

                            elementData = [{
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
                    }
                } else {
                    // Process all items concurrently
                    elementData = await Promise.all(items.map(async item => {
                        const rawData = this.modelManager.getElementData(item);
                        const data = (typeof rawData === 'object' && rawData !== null) ?
                            JSON.parse(JSON.stringify(rawData)) as SharedJsonObject : {};

                        const metadata = await this.modelManager.getMetadata(item) || {};
                        const convertedMetadata = JSON.parse(JSON.stringify(metadata));

                        // Add isUnconverted flag and handle metadata for unconverted elements
                        if (selectionState.selectionType === SelectionType.UNCONVERTED_ELEMENT) {
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

                // Get the validation result from modelManager
                const validationResult = this.modelManager.getCurrentValidation();

                // Send selection update with element data, model structure, and validation result
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                    selectionState: this.currentSelection,
                    elementData: elementData,
                    modelStructure: this.currentModelStructure,
                    expandedNodes: Array.from(this.expandedNodes),
                    validationResult: validationResult ?? undefined
                });

                console.log('[ModelPanel] Selection update sent:', {
                    selectionState: this.currentSelection,
                    elementData: elementData.map(e => ({
                        id: e.id,
                        name: e.name,
                        type: e.metadata?.type,
                        isUnconverted: e.metadata?.isUnconverted
                    })),
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

    // Add this helper method if not already present
    private async determineSelectionState(currentPage: ElementProxy, items: ItemProxy[]): Promise<SelectionState> {
        const type = await this.determineSelectionType(items);
        return {
            pageId: currentPage.id,
            selectedIds: items.map(item => item.id),
            selectionType: type
        };
    }


    /**
     * Updates the current selection state
     */
    private async updateSelectionState(page: PageProxy, items: ItemProxy[]): Promise<SelectionState> {
        const selectionType = await this.determineSelectionType(items);
        const newState: SelectionState = {
            pageId: page.id,
            selectedIds: items.map(item => item.id),
            selectionType: selectionType
        };

        this.currentSelection = newState;
        console.log('[ModelPanel] Selection state updated:', this.currentSelection);
        return newState;
    }

    /**
     * Determines the type of the current selection
     */
    private async determineSelectionType(items: ItemProxy[]): Promise<SelectionType> {
        if (items.length === 0) return SelectionType.NONE;
        if (items.length > 1) return SelectionType.MULTIPLE;

        const item = items[0];
        const metadata = await this.modelManager.getMetadata(item);

        // If we can't get metadata or there's no valid data, treat as unconverted
        if (!metadata?.type || metadata.type === SimulationObjectType.None) {
            return SelectionType.UNCONVERTED_ELEMENT;
        }

        return this.mapElementTypeToSelectionType(metadata.type);
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
        this.reactAppReady = true;  // Add this line

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            console.error('[ModelPanel] No active page found during React ready');
            return;
        }

        const isModel = this.modelManager.isQuodsiModel(currentPage);
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
            data: this.modelManager.getElementData(item),
            metadata: this.modelManager.getMetadata(item)
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
    private async handleGetElementData(elementId: string): Promise<void> {
        const element = this.client.getElementProxy(elementId);  // or whatever method you currently use

        if (!element) {
            console.error('[ModelPanel] Element not found:', elementId);
            return;
        }

        const rawData = this.modelManager.getElementData(element);
        const metadata = this.modelManager.getMetadata(element) || {} as MetaData;

        // Add isUnconverted flag if this element is in our unconverted set
        if (this.unconvertedElements.has(elementId)) {
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
                this.modelManager.clearElementData(element);

                // Send success message
                this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                    elementId: updateData.elementId
                });

                // Force a selection update with the new state
                await this.modelManager.validateModel();
                this.handleSelectionChange(viewport.getSelectedItems());
                return;
            }

            // Handle type conversion (when data is empty and type is provided)
            if (updateData.type && (!updateData.data || Object.keys(updateData.data).length === 0)) {
                console.log('[ModelPanel] Handling type conversion:', {
                    elementId: updateData.elementId,
                    newType: updateData.type
                });

                // Ensure model manager is initialized
                if (!this.modelManager.getModel()) {
                    const model = {
                        id: currentPage.id,
                        name: currentPage.getTitle() || 'New Model',
                        type: SimulationObjectType.Model
                    };
                    this.modelManager.initializeModel(model as Model, currentPage);
                }

                // Create initial data for the converted element
                const elementName = element instanceof BlockProxy ?
                    (element.id || 'Unnamed Block') :
                    'Unnamed Connector';

                const convertedData = {
                    id: updateData.elementId,
                    type: updateData.type,
                    name: elementName
                };

                // Register with model manager
                this.modelManager.registerElement(convertedData, element);

                // Update storage
                this.modelManager.setElementData(
                    element,
                    convertedData,
                    updateData.type,
                    {
                        id: updateData.elementId,
                        version: this.modelManager.CURRENT_VERSION
                    }
                );

                // Remove from unconverted tracking
                this.unconvertedElements.delete(updateData.elementId);

                // Send success message
                this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                    elementId: updateData.elementId
                });

                // Trigger revalidation and selection update
                await this.modelManager.validateModel();
                await this.handleSelectionChange(selectedItems);
                return;
            }

            // Regular update handling
            if (typeof updateData.data === 'object' && updateData.data !== null) {
                // Ensure model manager is initialized
                if (!this.modelManager.getModel()) {
                    const model = {
                        id: currentPage.id,
                        name: currentPage.getTitle() || 'New Model',
                        type: SimulationObjectType.Model
                    };
                    this.modelManager.initializeModel(model as Model, currentPage);
                }

                // Preserve or set element name
                const elementName = element instanceof BlockProxy ?
                    (element.id || 'Unnamed Block') :
                    'Unnamed Connector';

                const elementData = {
                    id: updateData.elementId,
                    type: updateData.type,
                    ...updateData.data as SharedJsonObject,
                    name: (updateData.data && typeof updateData.data === 'object' && !Array.isArray(updateData.data) && 'name' in updateData.data)
                        ? (updateData.data as { name?: string }).name || elementName
                        : elementName
                };

                // Register with model manager
                this.modelManager.registerElement(elementData, element);
                console.log('[ModelPanel] Element registered with model manager');

                // Update storage with consistent data
                this.modelManager.setElementData(
                    element,
                    elementData,
                    updateData.type,
                    {
                        id: updateData.elementId,
                        version: this.modelManager.CURRENT_VERSION
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
}