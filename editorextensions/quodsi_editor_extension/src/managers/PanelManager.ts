// PanelManager.ts
import { AuthPanel } from '../panels/AuthPanel';
import { ModelPanel } from '../panels/ModelPanel';

/**
 * Singleton class that manages access to panel instances across the extension.
 * This allows global access to panel instances for operations like reset authentication.
 */
export class PanelManager {
    private static instance: PanelManager;
    private _authPanel: AuthPanel | null = null;
    private _modelPanel: ModelPanel | null = null;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        console.log('[PanelManager] Created new instance');
    }

    /**
     * Gets the singleton instance of PanelManager
     */
    public static getInstance(): PanelManager {
        if (!PanelManager.instance) {
            PanelManager.instance = new PanelManager();
        }
        return PanelManager.instance;
    }

    /**
     * Registers the AuthPanel instance
     * @param panel The AuthPanel instance to register
     */
    public registerAuthPanel(panel: AuthPanel): void {
        console.log('[PanelManager] Registered AuthPanel');
        this._authPanel = panel;
    }

    /**
     * Registers the ModelPanel instance
     * @param panel The ModelPanel instance to register
     */
    public registerModelPanel(panel: ModelPanel): void {
        console.log('[PanelManager] Registered ModelPanel');
        this._modelPanel = panel;
    }

    /**
     * Gets the registered AuthPanel instance
     */
    public get authPanel(): AuthPanel | null {
        return this._authPanel;
    }

    /**
     * Gets the registered ModelPanel instance
     */
    public get modelPanel(): ModelPanel | null {
        return this._modelPanel;
    }

    /**
     * Resets authentication state in all registered panels
     */
    public resetAllPanelsAuthentication(): void {
        console.log('[PanelManager] Resetting authentication in all panels');

        if (this._authPanel) {
            this._authPanel.resetAuthentication();
        }

        if (this._modelPanel) {
            this._modelPanel.resetAuthentication();
        }
    }

    /**
     * Resets authentication state in the ModelPanel only
     */
    public resetModelPanelAuthentication(): void {
        console.log('[PanelManager] Resetting authentication in ModelPanel');

        if (this._modelPanel) {
            this._modelPanel.resetAuthentication();
        }
    }

    /**
     * Resets authentication state in the AuthPanel only
     */
    public resetAuthPanelAuthentication(): void {
        console.log('[PanelManager] Resetting authentication in AuthPanel');

        if (this._authPanel) {
            this._authPanel.resetAuthentication();
        }
    }

    /**
     * Force refresh the selection state in the ModelPanel
     */
    public refreshModelPanelSelection(): void {
        console.log('[PanelManager] Refreshing ModelPanel selection');

        if (this._modelPanel && this._modelPanel.isShown()) {
            // Ask the ModelPanel to refresh its own selection
            // This avoids accessing protected properties like client
            this._modelPanel.refreshSelection();
        }
    }

    /**
     * Reset the ModelPanel React app ready state, forcing reinitialization
     */
    public resetModelPanelReactAppReady(): void {
        console.log('[PanelManager] Resetting ModelPanel reactAppReady state');

        if (this._modelPanel) {
            this._modelPanel.resetReactAppReady();
        }
    }
}

// Export a pre-created instance for easier imports
export const panelManager = PanelManager.getInstance();