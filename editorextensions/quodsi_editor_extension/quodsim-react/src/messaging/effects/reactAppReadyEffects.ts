import { useEffect } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('ReactAppReadyEffects');

/**
 * Effect for normal REACT_APP_READY sending
 * 
 * Purpose:
 * - Sends the REACT_APP_READY message to the extension host when conditions are met
 * - This message indicates the React application is initialized and ready to receive messages
 * - Ensures auth state is properly obtained before sending the message
 * - Sets flags to prevent sending the message multiple times
 * 
 * Trigger Conditions (all must be true):
 * - hasSentReadyRef.current is false (haven't sent the message yet)
 * - state.app.initialized is true (app is initialized)
 * - state.app.panelType is defined (panel type is determined)
 * - state.auth.silentAuthInProgress is false (silent auth check completed)
 * 
 * Key Actions:
 * - Calls ensureAuthState() to get the current auth state from localStorage
 * - Force-sets authInitializedRef and silentAuthCheckCompletedRef if conditions are met
 * - Sends REACT_APP_READY message with panel type and auth state
 * - Sets hasSentReadyRef.current to true to prevent sending multiple times
 */
export function useReactAppReadyEffect(
  state: { 
    app: { initialized: boolean; panelType?: 'auth' | 'model' }; 
    auth: { silentAuthInProgress: boolean; lastUpdated?: number; isAuthenticated: boolean; userInfo?: any } 
  },
  sendMessage: (type: EnvelopeMessageType, data?: any) => void,
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any },
  hasSentReadyRef: React.MutableRefObject<boolean>,
  authInitializedRef: React.MutableRefObject<boolean>,
  authLoadingCycleCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    // SIMPLIFY the conditions - we only need app initialized, panel type, and completed auth (not loading)
    if (
      !hasSentReadyRef.current && // Haven't sent it yet
      state.app.initialized && // App is initialized
      state.app.panelType && // Panel type is determined
      !state.auth.silentAuthInProgress // Auth is not loading
    ) {
      // Check for valid auth in localStorage
      const { isAuthenticated, userInfo } = ensureAuthState();
      
      logger.debug("Conditions for REACT_APP_READY check:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType,
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: authLoadingCycleCompletedRef.current,
        authLoading: state.auth.silentAuthInProgress,
        isAuthenticated: isAuthenticated,
        hasUserInfo: !!userInfo
      });
      
      // Force these refs to true if other conditions are met
      if (!authInitializedRef.current && state.auth.lastUpdated) {
        logger.debug("Force setting authInitializedRef=true");
        authInitializedRef.current = true;
      }
      
      if (!authLoadingCycleCompletedRef.current && !state.auth.silentAuthInProgress && state.auth.lastUpdated) {
        logger.debug("Force setting authLoadingCycleCompletedRef=true");
        authLoadingCycleCompletedRef.current = true;
      }
      
      // SIMPLIFY - Force check all conditions after auth completes
      if (
        state.app.initialized && 
        state.app.panelType && 
        !state.auth.silentAuthInProgress && 
        !hasSentReadyRef.current
      ) {
        logger.log("*** ALL CONDITIONS MET FOR REACT_APP_READY! ***");
        logger.log("All conditions met for sending REACT_APP_READY:", {
          appInitialized: state.app.initialized,
          panelType: state.app.panelType,
          authInitialized: authInitializedRef.current,
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
        
        logger.log("Sent REACT_APP_READY message with auth state:", {
          isAuthenticated: isAuthenticated,
          hasUserInfo: !!userInfo
        });
        logger.log(`Successfully sent REACT_APP_READY message with isAuthenticated=${isAuthenticated}!`);
      }
    }
  }, [
    state.app.initialized, 
    state.app.panelType, 
    state.auth.lastUpdated, 
    state.auth.silentAuthInProgress, 
    state.auth.isAuthenticated, 
    state.auth.userInfo,
    sendMessage, 
    ensureAuthState,
    hasSentReadyRef,
    authInitializedRef,
    authLoadingCycleCompletedRef
  ]);
}

/**
 * Effect for emergency timer to ensure REACT_APP_READY is sent
 */
export function useEmergencyReactAppReadyEffect(
  state: { 
    app: { initialized: boolean; panelType?: 'auth' | 'model' }; 
    auth: { silentAuthInProgress: boolean; isAuthenticated: boolean; userInfo?: any; lastUpdated?: number } 
  },
  sendMessage: (type: EnvelopeMessageType, data?: any) => void,
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any },
  hasSentReadyRef: React.MutableRefObject<boolean>,
  authInitializedRef: React.MutableRefObject<boolean>,
  authLoadingCycleCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    // Create a timer to force send REACT_APP_READY after authentication
    const timer = setTimeout(() => {
      if (!hasSentReadyRef.current && state.app.initialized && state.app.panelType) {
        logger.warn("EMERGENCY: Forcing REACT_APP_READY after timer");
        
        // Force refs to true
        authInitializedRef.current = true;
        authLoadingCycleCompletedRef.current = true;
        
        // Check localStorage for authentication
        const { isAuthenticated, userInfo } = ensureAuthState();
        
        logger.warn("EMERGENCY check auth state:", {
          appInitialized: state.app.initialized,
          panelType: state.app.panelType,
          authLoading: state.auth.silentAuthInProgress,
          isAuthenticated: isAuthenticated,
          hasUserInfo: !!userInfo,
          lastUpdated: state.auth.lastUpdated ? new Date(state.auth.lastUpdated).toISOString() : 'undefined'
        });
        
        // Force send REACT_APP_READY
        sendMessage(EnvelopeMessageType.REACT_APP_READY, {
          panel: state.app.panelType,
          isAuthenticated: isAuthenticated,
          user: userInfo,
        });
        
        // Mark as sent
        hasSentReadyRef.current = true;
        
        logger.warn(`EMERGENCY: Successfully forced REACT_APP_READY with isAuthenticated=${isAuthenticated}`);
      }
    }, 3000); // 3 second timer
    
    // Clean up
    return () => clearTimeout(timer);
  }, [
    state.app.initialized, 
    state.app.panelType,
    state.auth.silentAuthInProgress,
    state.auth.lastUpdated,
    state.auth.isAuthenticated,
    state.auth.userInfo,
    sendMessage, 
    ensureAuthState,
    hasSentReadyRef,
    authInitializedRef,
    authLoadingCycleCompletedRef
  ]);
}
