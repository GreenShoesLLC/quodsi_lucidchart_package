import {
    MessageTypes,
    AuthActionType,
    ComponentLogger
} from "@quodsi/shared";
import { AppState } from "../../../QuodsiApp";
import { MessageHandler } from "../messageHandlers";

// Define a constant for the logger prefix
const LOG_PREFIX = '[AuthMessageHandlers]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Helper function to enable/disable logging for auth message handlers
 */
export const setAuthMessageHandlersLogging = (enabled: boolean): void => {
  ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

/**
 * Consolidated AUTH message handler that replaces the individual auth-related handlers
 */
export const authMessageHandlers: Partial<{
    [T in MessageTypes]: MessageHandler<T>;
}> = {
    [MessageTypes.AUTH]: (payload, { setState, setError, sendMessage }) => {
        ComponentLogger.log(LOG_PREFIX, "Processing AUTH message:", payload);
        
        switch (payload.type) {
            case AuthActionType.PANEL_INIT:
                ComponentLogger.log(LOG_PREFIX, "Processing AUTH panel init:", payload.data);
                setState((prev: AppState) => {
                    // Only update panel type if it's not already set or if it's different
                    const newPanelType = payload.data?.panelType || null;
                    const shouldUpdate = !prev.panelType || prev.panelType !== newPanelType;
                    
                    if (shouldUpdate) {
                        ComponentLogger.log(LOG_PREFIX, `Updating panel type from ${prev.panelType} to ${newPanelType}`);
                        return {
                            ...prev,
                            panelType: newPanelType,
                            // Also reset isProcessing when panel type changes to avoid stuck state
                            isProcessing: false
                        };
                    }
                    
                    return prev;
                });

                // Delay requesting auth status to ensure MSAL is fully initialized
                if (payload.data?.panelType === "auth") {
                    ComponentLogger.log(
                        LOG_PREFIX, "Auth panel initialized, scheduling auth status request"
                    );
                    setTimeout(() => {
                        ComponentLogger.log(LOG_PREFIX, "Now requesting auth status after delay");
                        sendMessage(MessageTypes.AUTH, {
                            type: AuthActionType.STATUS_REQUEST
                        });
                    }, 1000);
                }
                break;
                
            case AuthActionType.STATUS_RESPONSE:
                ComponentLogger.log(LOG_PREFIX, "Processing AUTH status response:", payload.data);
                setState((prev: AppState) => ({
                    ...prev,
                    isAuthenticated: payload.data?.isAuthenticated || false,
                    userInfo: payload.data?.userInfo || null,
                }));
                break;
                
            case AuthActionType.COMPLETED:
                ComponentLogger.log(LOG_PREFIX, "Processing AUTH completed:", payload.data);
                setState((prev: AppState) => ({
                    ...prev,
                    isAuthenticated: payload.data?.success || false,
                    userInfo: payload.data?.userInfo || null,
                    isProcessingAuth: false,
                }));
                
                // Force a re-render when auth completes
                if (payload.data?.success) {
                    // Small delay to ensure auth state is fully updated
                    setTimeout(() => {
                        ComponentLogger.log(LOG_PREFIX, "Refreshing UI after auth completion");
                        setState((prev) => ({ ...prev }));
                    }, 500);
                }
                break;
                
            case AuthActionType.ERROR:
                ComponentLogger.log(LOG_PREFIX, "Processing AUTH error:", payload.data);
                setState((prev: AppState) => ({
                    ...prev,
                    isProcessingAuth: false,
                }));
                if (payload.data?.error) {
                    setError(payload.data.error);
                }
                break;
        }
    }
};