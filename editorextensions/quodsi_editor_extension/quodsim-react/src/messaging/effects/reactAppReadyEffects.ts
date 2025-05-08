import { useEffect } from 'react';
import { EnvelopeMessageType } from '@quodsi/shared';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('ReactAppReadyEffects');

/**
 * Effect for normal REACT_APP_READY sending
 */
export function useReactAppReadyEffect(
  state: { 
    app: { initialized: boolean; panelType?: 'auth' | 'model' }; 
    auth: { isLoading: boolean; lastUpdated?: number; isAuthenticated: boolean; userInfo?: any } 
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
      !state.auth.isLoading // Auth is not loading
    ) {
      // Check for valid auth in localStorage
      const { isAuthenticated, userInfo } = ensureAuthState();
      
      console.log("[REACT][ReactAppReadyEffects] Conditions for REACT_APP_READY check:", {
        appInitialized: state.app.initialized,
        panelType: state.app.panelType,
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: authLoadingCycleCompletedRef.current,
        authLoading: state.auth.isLoading,
        isAuthenticated: isAuthenticated,
        hasUserInfo: !!userInfo
      });
      
      // Force these refs to true if other conditions are met
      if (!authInitializedRef.current && state.auth.lastUpdated) {
        console.log("[REACT][ReactAppReadyEffects] Force setting authInitializedRef=true");
        authInitializedRef.current = true;
      }
      
      if (!authLoadingCycleCompletedRef.current && !state.auth.isLoading && state.auth.lastUpdated) {
        console.log("[REACT][ReactAppReadyEffects] Force setting authLoadingCycleCompletedRef=true");
        authLoadingCycleCompletedRef.current = true;
      }
      
      // SIMPLIFY - Force check all conditions after auth completes
      if (
        state.app.initialized && 
        state.app.panelType && 
        !state.auth.isLoading && 
        !hasSentReadyRef.current
      ) {
        console.log("[REACT][ReactAppReadyEffects] *** ALL CONDITIONS MET FOR REACT_APP_READY! ***");
        logger.log("All conditions met for sending REACT_APP_READY:", {
          appInitialized: state.app.initialized,
          panelType: state.app.panelType,
          authInitialized: authInitializedRef.current,
          authLoading: state.auth.isLoading,
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
        console.log(`[REACT][ReactAppReadyEffects] Successfully sent REACT_APP_READY message with isAuthenticated=${isAuthenticated}!`);
      }
    }
  }, [
    state.app.initialized, 
    state.app.panelType, 
    state.auth.lastUpdated, 
    state.auth.isLoading, 
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
    auth: { isLoading: boolean; isAuthenticated: boolean; userInfo?: any; lastUpdated?: number } 
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
        console.log("[REACT][ReactAppReadyEffects] EMERGENCY: Forcing REACT_APP_READY after timer");
        
        // Force refs to true
        authInitializedRef.current = true;
        authLoadingCycleCompletedRef.current = true;
        
        // Check localStorage for authentication
        const { isAuthenticated, userInfo } = ensureAuthState();
        
        console.log("[REACT][ReactAppReadyEffects] EMERGENCY check auth state:", {
          appInitialized: state.app.initialized,
          panelType: state.app.panelType,
          authLoading: state.auth.isLoading,
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
        
        console.log(`[REACT][ReactAppReadyEffects] EMERGENCY: Successfully forced REACT_APP_READY with isAuthenticated=${isAuthenticated}`);
      }
    }, 3000); // 3 second timer
    
    // Clean up
    return () => clearTimeout(timer);
  }, [
    state.app.initialized, 
    state.app.panelType,
    state.auth.isLoading,
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
