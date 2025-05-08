import { useEffect } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { createMessageHandler } from '../handlers';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('MessageListenerEffect');

/**
 * Effect for setting up message listener and handling backward compatibility
 */
export function useMessageListenerEffect(
  state: any,
  dispatch: React.Dispatch<any>,
  sendMessage: (type: EnvelopeMessageType, data?: any) => void,
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any },
  hasSentReadyRef: React.MutableRefObject<boolean>,
  processedMessageIds: React.MutableRefObject<Set<string>>,
  authInitializedRef: React.MutableRefObject<boolean>,
  silentAuthCheckCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    const handleMessage = createMessageHandler(state, dispatch, processedMessageIds, sendMessage, ensureAuthState);
    
    // Add message event listener
    window.addEventListener("message", handleMessage);
    
    // For backward compatibility - handle REACT_APP_READY through the original method as well
    // This handles edge cases where the dedicated effect might have missed a state change
    if (
      state.app.initialized && 
      state.app.panelType && 
      !state.auth.silentAuthInProgress && 
      !hasSentReadyRef.current
    ) {
      // Check for valid auth in localStorage
      const { isAuthenticated, userInfo } = ensureAuthState();
      
      console.log("[REACT][MessageListenerEffect] *** ALL CONDITIONS MET FOR REACT_APP_READY IN LISTENER! ***");
      logger.log("All conditions met for sending REACT_APP_READY in listener:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType,
        authLoading: state.auth.silentAuthInProgress,
        isAuthenticated: isAuthenticated,
        hasUserInfo: !!userInfo
      });
      
      sendMessage(EnvelopeMessageType.REACT_APP_READY, {
        panel: state.app.panelType,
        isAuthenticated: isAuthenticated,
        user: userInfo,
      });
      
      // Mark as sent so we don't send it again
      hasSentReadyRef.current = true;
      
      logger.log("Sent REACT_APP_READY message with auth state from listener:", {
        isAuthenticated: isAuthenticated,
        hasUserInfo: !!userInfo
      });
      console.log(`[REACT][MessageListenerEffect] Successfully sent REACT_APP_READY from listener with isAuthenticated=${isAuthenticated}!`);
    } else if (!hasSentReadyRef.current) {
      logger.debug("Waiting to send REACT_APP_READY:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType,
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: silentAuthCheckCompletedRef.current,
        authLoading: state.auth.silentAuthInProgress,
        authLastUpdated: state.auth.lastUpdated ? new Date(state.auth.lastUpdated).toISOString() : 'not set',
        isAuthenticated: state.auth.isAuthenticated
      });
      
      // Enhanced logging to track which conditions are preventing REACT_APP_READY
      if (state.app.initialized && state.app.panelType) {
        if (!authInitializedRef.current) {
          console.log("[REACT][MessageListenerEffect] REACT_APP_READY blocked: authInitializedRef is false");
        }
        if (!silentAuthCheckCompletedRef.current) {
          console.log("[REACT][MessageListenerEffect] REACT_APP_READY blocked: silentAuthCheckCompletedRef is false");
        }
        if (!state.auth.lastUpdated) {
          console.log("[REACT][MessageListenerEffect] REACT_APP_READY blocked: lastUpdated is not set");
        }
      }
    }

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    state,
    dispatch,
    sendMessage,
    ensureAuthState,
    hasSentReadyRef,
    processedMessageIds,
    authInitializedRef,
    silentAuthCheckCompletedRef
  ]);
}
