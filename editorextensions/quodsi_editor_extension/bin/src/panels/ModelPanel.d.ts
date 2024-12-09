import { Panel, EditorClient, ItemProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
export declare class ModelPanel extends Panel {
    private modelManager;
    private reactAppReady;
    private storageAdapter;
    private conversionService;
    private expandedNodes;
    private currentModelStructure?;
    private currentSelection;
    constructor(client: EditorClient, modelManager: ModelManager);
    /**
     * Updates the model structure based on current model data
     */
    private updateModelStructure;
    /**
     * Handles tree node expansion state changes
     */
    private handleTreeNodeToggle;
    /**
     * Handles bulk tree state updates
     */
    private handleTreeStateUpdate;
    /**
     * Expands the path to a specific node
     */
    private handleExpandPath;
    /**
     * Sends current tree state to React app
     */
    private sendTreeStateUpdate;
    private initializeModelManager;
    /**
     * Shows the panel
     */
    show(): void;
    /**
     * Hides the panel
     */
    hide(): void;
    /**
     * Handles selection changes in the editor
     */
    handleSelectionChange(items: ItemProxy[]): void;
    /**
         * Sends a typed message ensuring it's serializable
         */
    private sendTypedMessage;
    /**
     * Updates the current selection state
     */
    private updateSelectionState;
    /**
     * Determines the type of the current selection
     */
    private determineSelectionType;
    /**
         * Maps SimulationObjectType to SelectionType
         */
    private mapElementTypeToSelectionType;
    /**
     * Handles messages from the React app
     */
    protected messageFromFrame(message: any): void;
    /**
     * Handles model removal request
     */
    private handleRemoveModel;
    /**
     * Handles React app ready signal
     */
    private handleReactReady;
    /**
     * Sends initial state to React app
     */
    private sendInitialState;
    /**
     * Sends selection update to React app
     */
    private sendSelectionUpdate;
    /**
     * Gets data for selected elements
     */
    private getSelectedElementsData;
    /**
     * Handles page conversion request
     */
    private handleConvertRequest;
    /**
     * Handles element data request
     */
    private handleGetElementData;
    /**
     * Handles element data update
     */
    private handleUpdateElementData;
    /**
     * Handles model validation request
     */
    private handleValidateModel;
    /**
     * Handles model saved message
     */
    private handleModelSaved;
    /**
     * Handles element saved message
     */
    private handleElementSaved;
    /**
     * Finds an element by ID
     */
    private findElementById;
}
//# sourceMappingURL=ModelPanel.d.ts.map