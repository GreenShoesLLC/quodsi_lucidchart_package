import { EditorClient, ItemProxy, Panel } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { MessagePayloads, MessageTypes } from '@quodsi/shared';
export declare class ModelPanel extends Panel {
    private selectionManager;
    private treeStateManager;
    private messaging;
    private reactAppReady;
    private modelManager;
    private conversionService;
    private expandedNodes;
    private currentModelStructure?;
    private currentSelection;
    private isHandlingSelectionChange;
    constructor(client: EditorClient, modelManager: ModelManager);
    private static readonly logger;
    private setupModelMessageHandlers;
    /**
         * Updates the model structure based on current model data and validates the model
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
    handleValidateRequest(): Promise<void>;
    /**
     * Handles selection changes in the editor
     */
    handleSelectionChange(items: ItemProxy[]): Promise<void>;
    private sendSelectionUpdateToReact;
    private buildElementData;
    private handleError;
    private buildModelElementData;
    private buildSelectedElementsData;
    /**
     * Handles model removal request
     */
    private handleRemoveModel;
    private handleReactReady;
    /**
     * Sends initial state to React app
     */
    private sendInitialState;
    /**
     * Sends selection update to React app
     */
    /**
     * Gets data for selected elements
     */
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
    protected sendTypedMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): void;
    protected messageFromFrame(message: any): void;
}
//# sourceMappingURL=ModelPanel.d.ts.map