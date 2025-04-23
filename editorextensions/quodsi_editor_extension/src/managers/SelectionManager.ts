// SelectionManager.ts (Updated)
import { ElementProxy, ItemProxy, PageProxy, BlockProxy, DocumentProxy, Viewport, EditorClient } from 'lucid-extension-sdk';
import {
    ModelManager
} from '../core/ModelManager';
import {
    MessageTypes,
    ModelItemData,
    MessagePayloads,
    EditorReferenceData,
    DiagramElementType,
    SimulationObjectType,
    SelectionType,
    SelectionState,
    ExtensionMessaging,
    ModelStructure,
    ValidationResult,
    MetaData
} from '@quodsi/shared';

export class SelectionManager {
    private static readonly LOG_PREFIX = '[SelectionManager]';
    private currentSelection: SelectionState;
    private modelManager: ModelManager;
    private selectionChangeListeners: ((selection: SelectionState) => void)[] = [];
    private loggingEnabled: boolean = false;
    private isHandlingSelectionChange: boolean = false;
    private reactAppReady: boolean = false;
    private currentModelStructure?: ModelStructure = undefined;
    private sendMessageCallback: <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => void;

    constructor(modelManager: ModelManager,
        sendMessageCallback: <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => void
    ) {
        this.modelManager = modelManager;
        this.sendMessageCallback = sendMessageCallback;
        this.currentSelection = {
            pageId: '',
            selectedIds: [],
            selectionType: SelectionType.NONE
        };
        this.log('SelectionManager initialized');
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
            console.log(`${SelectionManager.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${SelectionManager.LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Sets the React app ready state - should be called by ModelPanel when REACT_APP_READY is received
     */
    public setReactAppReady(ready: boolean): void {
        this.log(`Setting reactAppReady to ${ready}`);
        this.reactAppReady = ready;
    }

    /**
     * Returns whether the React app is ready to receive messages
     */
    public isReactAppReady(): boolean {
        return this.reactAppReady;
    }

    /**
     * Determines the selection state based on the current page and selected items
     */
    public async determineSelectionState(currentPage: ElementProxy, items: ItemProxy[]): Promise<SelectionState> {
        this.log('Determining selection state', {
            pageId: currentPage.id,
            itemCount: items.length,
            items: items.map(i => i.id)
        });

        const type = await this.determineSelectionType(items);
        const state = {
            pageId: currentPage.id,
            selectedIds: items.map(item => item.id),
            selectionType: type
        };

        this.log('Selection state determined', state);
        return state;
    }

    /**
     * Determines the selection type based on the selected items
     */
    private async determineSelectionType(items: ItemProxy[]): Promise<SelectionType> {
        this.log('Determining selection type', { itemCount: items.length });

        if (items.length === 0) {
            this.log('No items selected, returning NONE');
            return SelectionType.NONE;
        }
        if (items.length > 1) {
            this.log('Multiple items selected, returning MULTIPLE');
            return SelectionType.MULTIPLE;
        }

        const item = items[0];
        this.log('Processing single item selection', { itemId: item.id });

        if (this.modelManager.isUnconvertedElement(item)) {
            this.log('Item is unconverted', { itemId: item.id });
            return SelectionType.UNCONVERTED_ELEMENT;
        }

        const metadata = await this.modelManager.getMetadata(item);
        this.log('Retrieved metadata', { itemId: item.id, metadata });

        if (!metadata?.type || metadata.type === SimulationObjectType.None) {
            this.log('Invalid or None type metadata, treating as unconverted', { itemId: item.id });
            return SelectionType.UNCONVERTED_ELEMENT;
        }

        const selectionType = this.mapElementTypeToSelectionType(metadata.type);
        this.log('Mapped element type to selection type', {
            itemId: item.id,
            elementType: metadata.type,
            selectionType
        });
        return selectionType;
    }

    /**
     * Maps simulation object type to selection type
     */
    public mapElementTypeToSelectionType(elementType: SimulationObjectType): SelectionType {
        this.log('Mapping element type to selection type', { elementType });

        // Create a type-safe mapping object
        const mapping: Partial<Record<SimulationObjectType, SelectionType>> = {
            [SimulationObjectType.Activity]: SelectionType.ACTIVITY,
            [SimulationObjectType.Connector]: SelectionType.CONNECTOR,
            [SimulationObjectType.Entity]: SelectionType.ENTITY,
            [SimulationObjectType.Generator]: SelectionType.GENERATOR,
            [SimulationObjectType.Resource]: SelectionType.RESOURCE,
            [SimulationObjectType.Model]: SelectionType.MODEL
        };

        const result = mapping[elementType] ?? SelectionType.UNKNOWN_BLOCK;
        this.log('Type mapping result', { elementType, result });
        return result;
    }

    /**
     * Validates a selection state object
     */
    public validateSelection(selection: SelectionState): boolean {
        this.log('Validating selection state', selection);
        const isValid = (
            selection &&
            typeof selection.pageId === 'string' &&
            Array.isArray(selection.selectedIds) &&
            (typeof selection.selectionType === 'number' || typeof selection.selectionType === 'string')
        );

        if (!isValid) {
            this.logError('Invalid selection state', selection);
        }
        return isValid;
    }

    /**
     * Registers a listener for selection changes
     */
    public onSelectionChange(listener: (selection: SelectionState) => void): void {
        this.log('Adding selection change listener');
        this.selectionChangeListeners.push(listener);
    }

    /**
     * Gets the current selection state
     */
    public getCurrentSelection(): SelectionState {
        this.log('Getting current selection', this.currentSelection);
        return this.currentSelection;
    }

    /**
     * Sets the current selection state and notifies listeners
     */
    public setCurrentSelection(selection: SelectionState): void {
        this.log('Setting current selection', selection);

        if (!this.validateSelection(selection)) {
            this.logError('Invalid selection state, not updating', selection);
            return;
        }

        this.currentSelection = selection;
        this.notifySelectionChange();
    }

    /**
     * Notifies registered listeners of selection changes
     */
    private notifySelectionChange(): void {
        this.log('Notifying selection change listeners', {
            listenerCount: this.selectionChangeListeners.length
        });

        this.selectionChangeListeners.forEach((listener, index) => {
            try {
                this.log(`Executing listener ${index}`);
                listener(this.currentSelection);
            } catch (error) {
                this.logError(`Error in selection change listener ${index}:`, error);
            }
        });
    }

    /**
     * Main entry point for handling selection changes - migrated from ModelPanel
     */
    public async handleSelectionChange(client: EditorClient, items: ItemProxy[]): Promise<void> {
        this.log('Executing handleSelectionChange');
        this.isHandlingSelectionChange = true;
        try {
            const viewport = new Viewport(client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            // await this.updateModelStructure();
            const selectionState = await this.determineSelectionState(currentPage, items);
            this.setCurrentSelection(selectionState);
            this.reactAppReady = true;
            // Only send messages if the React app is ready
            if (this.reactAppReady) {
                this.log('reactAppReady=true, calling sendSelectionBasedMessage');
                await this.sendSelectionBasedMessage(client, selectionState, items, currentPage);
            } else {
                this.log('React app not ready yet, skipping sending selection message');
            }
        } catch (error) {
            this.handleError('Error handling selection change:', error);
        } finally {
            this.isHandlingSelectionChange = false;
        }
    }

    /**
     * Updates the current model structure - migrated from ModelPanel
     */
    private async updateModelStructure(): Promise<void> {
        // Get model structure from ModelManager
        this.currentModelStructure = await this.modelManager.getModelStructure();
        this.log('Model structure updated:', this.currentModelStructure);

        // Validate model
        const validationResult = await this.modelManager.validateModel();
        this.log('Model validation result:', validationResult);

        // If we're not in a selection change context, notify the React app of the validation update
        if (!this.isHandlingSelectionChange && this.reactAppReady) {
            this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
        }
    }

    /**
     * Sends the appropriate message based on selection state - migrated from ModelPanel
     */
    private async sendSelectionBasedMessage(
        client: EditorClient,
        selectionState: SelectionState,
        items: ItemProxy[],
        currentPage: ElementProxy
    ): Promise<void> {
        this.log("sendSelectionBasedMessage START - Selection Type:", selectionState.selectionType);

        if (items.length === 1) {
            const item = items[0];
            this.log("Item metadata:", this.modelManager.getMetadata(item));
        }

        // Convert ElementProxy to PageProxy if needed
        const page = new PageProxy(currentPage.id, client);

        // Early check - if page is not a model, always send PAGE_NO_MODEL equivalent
        if (!this.modelManager.isQuodsiModel(page)) {
            const document = new DocumentProxy(client);
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                selectionType: SelectionType.NONE,
                documentId: document.id,
                hasModel: false,
                selectionState: {
                    pageId: currentPage.id,
                    selectedIds: [],
                    selectionType: SelectionType.NONE
                }
            });
            return;
        }

        const validationResult = await this.modelManager.validateModel();
        const document = new DocumentProxy(client);
        const documentId = document.id;

        switch (selectionState.selectionType) {
            case SelectionType.NONE: {
                // Build model item data for the page since it's a model
                const modelItemData = await this.buildModelItemData(page);

                // Send SELECTION_CHANGED with page with model data
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                    selectionType: SelectionType.NONE,
                    documentId,
                    hasModel: true,
                    selectionState,
                    validationResult,
                    modelItemData
                });
                break;
            }

            case SelectionType.MULTIPLE: {
                const modelItemData = await Promise.all(
                    items.map(item => this.buildModelItemData(item))
                );

                // Send SELECTION_CHANGED with multiple selection data
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                    selectionType: SelectionType.MULTIPLE,
                    documentId,
                    hasModel: true,
                    selectionState,
                    validationResult,
                    modelItemData
                });
                break;
            }

            case SelectionType.UNCONVERTED_ELEMENT: {
                if (items.length === 1) {
                    const item = items[0];
                    const modelItemData = await this.buildModelItemData(item);
                    modelItemData.isUnconverted = true;

                    // Send SELECTION_CHANGED with unconverted element data
                    this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                        selectionType: SelectionType.UNCONVERTED_ELEMENT,
                        documentId,
                        hasModel: true,
                        selectionState,
                        validationResult,
                        modelItemData,
                        diagramElementType: item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE
                    });
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
                        // Get simulation object payload data
                        const simObjPayload = await this.createSimulationObjectPayload(
                            client,
                            currentPage,
                            item,
                            {}  // We're not using the base payload anymore
                        );

                        // Send SELECTION_CHANGED with simulation object data
                        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                            selectionType: selectionState.selectionType,
                            documentId,
                            hasModel: true,
                            selectionState,
                            validationResult,
                            modelItemData: simObjPayload.modelItemData,
                            referenceData: simObjPayload.referenceData,
                            diagramElementType: simObjPayload.diagramElementType,
                        });
                    }
                }
                break;
            }

            default: {
                // Build model item data for the page since it's a model
                const modelItemData = await this.buildModelItemData(page);

                // Send SELECTION_CHANGED with default (page with model) data
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                    selectionType: SelectionType.NONE,
                    documentId,
                    hasModel: true,
                    selectionState,
                    validationResult,
                    modelItemData
                });
                break;
            }
        }
    }

    /**
     * Creates a payload for simulation object selection - migrated from ModelPanel
     */
    private async createSimulationObjectPayload(
        client: EditorClient,
        page: ElementProxy,
        item: ItemProxy,
        basePayload: any
    ): Promise<MessagePayloads[MessageTypes.SELECTION_CHANGED]> {
        const metadata = this.modelManager.getMetadata(item);
        if (!metadata) {
            throw new Error('No metadata found for item');
        }

        const modelItemData = await this.buildModelItemData(item);
        const diagramElementType = item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE;

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
                referenceData.resourceRequirements = requirements;
            }
        }

        const document = new DocumentProxy(client);

        // Create payload for SELECTION_CHANGED
        return {
            ...basePayload,
            selectionType: this.mapElementTypeToSelectionType(metadata.type),
            documentId: document.id,
            hasModel: true,
            selectionState: {
                pageId: page.id,
                selectedIds: [item.id],
                selectionType: this.mapElementTypeToSelectionType(metadata.type)
            },
            modelItemData,
            referenceData,
            diagramElementType,
            validationResult: basePayload?.validationResult
        };
    }

    /**
     * Builds a ModelItemData object from an item - migrated from ModelPanel
     */
    public async buildModelItemData(item: ItemProxy | PageProxy): Promise<ModelItemData> {
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
        const convertedData = rawData ? JSON.parse(JSON.stringify(rawData)) : {};

        return {
            id: item.id,
            data: convertedData,
            metadata: defaultMetadata,
            name
        };
    }

    /**
     * Error handling method - migrated from ModelPanel
     */
    private handleError(message: string, error: any): void {
        this.logError(`${message}`, error);
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }

    /**
     * Helper to send typed messages - migrated from ModelPanel
     */
    private sendTypedMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): void {
        // Use the provided callback instead of calling messaging directly
        this.sendMessageCallback(type, payload);
    }
}