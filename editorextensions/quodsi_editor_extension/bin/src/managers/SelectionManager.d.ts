import { ElementProxy, ItemProxy, PageProxy, EditorClient } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { MessageTypes, ModelItemData, MessagePayloads, SimulationObjectType, SelectionType, SelectionState } from '@quodsi/shared';
export declare class SelectionManager {
    private static readonly LOG_PREFIX;
    private currentSelection;
    private modelManager;
    private selectionChangeListeners;
    private loggingEnabled;
    private isHandlingSelectionChange;
    private reactAppReady;
    private sendMessageCallback;
    constructor(modelManager: ModelManager, sendMessageCallback: <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => void);
    setLogging(enabled: boolean): void;
    private isLoggingEnabled;
    private log;
    private logError;
    /**
     * Sets the React app ready state - should be called by ModelPanel when REACT_APP_READY is received
     */
    setReactAppReady(ready: boolean): void;
    /**
     * Determines the selection state based on the current page and selected items
     */
    determineSelectionState(currentPage: ElementProxy, items: ItemProxy[]): Promise<SelectionState>;
    /**
     * Determines the selection type based on the selected items
     */
    private determineSelectionType;
    /**
     * Maps simulation object type to selection type
     */
    mapElementTypeToSelectionType(elementType: SimulationObjectType): SelectionType;
    /**
     * Validates a selection state object
     */
    validateSelection(selection: SelectionState): boolean;
    /**
     * Registers a listener for selection changes
     */
    onSelectionChange(listener: (selection: SelectionState) => void): void;
    /**
     * Gets the current selection state
     */
    getCurrentSelection(): SelectionState;
    /**
     * Sets the current selection state and notifies listeners
     */
    setCurrentSelection(selection: SelectionState): void;
    /**
     * Notifies registered listeners of selection changes
     */
    private notifySelectionChange;
    /**
     * Main entry point for handling selection changes - migrated from ModelPanel
     */
    handleSelectionChange(client: EditorClient, items: ItemProxy[]): Promise<void>;
    /**
     * Sends the appropriate message based on selection state - migrated from ModelPanel
     */
    private sendSelectionBasedMessage;
    /**
     * Creates a payload for simulation object selection - migrated from ModelPanel
     */
    private createSimulationObjectPayload;
    /**
     * Builds a ModelItemData object from an item - migrated from ModelPanel
     */
    buildModelItemData(item: ItemProxy | PageProxy): Promise<ModelItemData>;
    /**
     * Error handling method - migrated from ModelPanel
     */
    private handleError;
    /**
     * Helper to send typed messages - migrated from ModelPanel
     */
    private sendTypedMessage;
}
//# sourceMappingURL=SelectionManager.d.ts.map