import { EditorClient, ItemProxy, Panel } from 'lucid-extension-sdk';
import { MessagePayloads, MessageTypes, AuthActionType } from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
export declare class ModelPanel extends Panel {
    private static readonly LOG_PREFIX;
    private loggingEnabled;
    private selectionManager;
    private messaging;
    private reactAppReady;
    private modelManager;
    private _isShown;
    private currentModelStructure?;
    private currentSelection;
    private isHandlingSelectionChange;
    private isAuthenticated;
    private userInfo;
    private versionManager;
    constructor(client: EditorClient, modelManager: ModelManager);
    setLogging(enabled: boolean): void;
    private isLoggingEnabled;
    private log;
    private logError;
    protected sendAuthMessage(type: AuthActionType, data?: any): void;
    private setupModelMessageHandlers;
    initializeOrUpdateModel(): Promise<import("../data_sources").ModelDefinition | null>;
    private handleOutputCreatePage;
    private handleOutputCreateDashboard;
    private list_blocks;
    private handleConvertElement;
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
    private handleActionResponseError;
    /**
     * Handles model removal request
     */
    private handleRemoveModel;
    /**
     * Called when the iframe has been removed from the DOM
     * We override this method to clean up resources
     */
    protected frameClosed(): void;
    private handleReactReady;
    /**
     * Resets the authentication state for this panel
     * This can be called when a user logs out or switches accounts
     */
    resetAuthentication(): void;
    /**
     * Reset the reactAppReady flag, forcing reinitialization
     * on the next REACT_APP_READY message
     */
    resetReactAppReady(): void;
    /**
     * Checks if the panel is currently being shown
     */
    isShown(): boolean;
    /**
     * Refreshes the current selection state
     * This method is used by PanelManager to force a selection refresh
     */
    refreshSelection(): void;
    /**
     * Handles page conversion request
     */
    private handlePageConvertRequest;
    /**
     * Handles element data update
     */
    private handleUpdateElementData;
    private handleSimulateModel;
    /**
     * Handles model validation request
     */
    private handleValidateModel;
    protected sendTypedMessage<T extends MessageTypes>(type: T, payload?: MessagePayloads[T]): void;
    protected messageFromFrame(message: any): void;
}
//# sourceMappingURL=ModelPanel.d.ts.map