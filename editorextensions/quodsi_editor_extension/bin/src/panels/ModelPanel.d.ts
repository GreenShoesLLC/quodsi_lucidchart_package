import { EditorClient, ItemProxy, Panel } from 'lucid-extension-sdk';
import { MessagePayloads, MessageTypes } from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
export declare class ModelPanel extends Panel {
    private static readonly LOG_PREFIX;
    private loggingEnabled;
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
    setLogging(enabled: boolean): void;
    private isLoggingEnabled;
    private log;
    private logError;
    private setupModelMessageHandlers;
    private handleOutputCreatePage;
    private handleSimulationStatusUpdate;
    private updateModelStructure;
    private createSimulationObjectPayload;
    private handleConvertElement;
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
    handleSelectionChange(items: ItemProxy[]): Promise<void>;
    private sendSelectionBasedMessage;
    private handleError;
    private buildModelItemData;
    private buildModelItemDataArray;
    /**
     * Handles model removal request
     */
    private handleRemoveModel;
    private handleReactReady;
    /**
     * Handles page conversion request
     */
    private handleConvertRequest;
    /**
     * Handles element data update
     */
    private handleUpdateElementData;
    private handleSimulateModel;
    /**
     * Handles model validation request
     */
    private handleValidateModel;
    /**
     * Handles model saved message
     */
    private handleModelSaved;
    protected sendTypedMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): void;
    protected messageFromFrame(message: any): void;
}
//# sourceMappingURL=ModelPanel.d.ts.map