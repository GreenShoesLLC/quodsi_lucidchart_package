import { useEffect } from 'react';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('InitializationEffects');

/**
 * Effect for detecting panel type from URL
 * 
 * Purpose:
 * - Determines the panel type (auth or model) based on URL parameters or path
 * - Initializes the app state with the correct panel type
 * - Ensures consistent app initialization even with different entry points
 * 
 * Trigger:
 * - When state.app.initialized is false (only runs during initial app setup)
 * 
 * Key Actions:
 * - Extracts panel type from URL search parameters (e.g., '?panel=auth')
 * - Falls back to checking URL path or initialPanelType prop
 * - Defaults to 'model' panel if no type can be determined
 * - Dispatches APP_INITIALIZE action with the detected panel type
 */
export function usePanelTypeDetectionEffect(
  state: { app: { initialized: boolean } },
  dispatch: React.Dispatch<any>,
  initialPanelType?: 'auth' | 'model' | 'results' | 'studio-results'
) {
  useEffect(() => {
    if (!state.app.initialized) {
      // Try to determine panel type from URL search params
      const urlParams = new URLSearchParams(window.location.search);
      const panelParam = urlParams.get("panel");
      const viewParam = urlParams.get("view");

      let detectedType: "auth" | "model" | "results" | "studio-results" | undefined = initialPanelType;

      if (viewParam === "studio-results") {
        detectedType = "studio-results";
      } else if (viewParam === "results") {
        // Modal mode: view=results takes precedence
        detectedType = "results";
      } else if (panelParam) {
        // If panel parameter exists, use it
        if (panelParam.toLowerCase() === "auth") {
          detectedType = "auth";
        } else if (panelParam.toLowerCase() === "results") {
          detectedType = "results";
        } else {
          detectedType = "model";
        }
      } else if (window.location.pathname.includes("auth")) {
        // Fallback to checking URL path
        detectedType = "auth";
      } else if (!detectedType) {
        // Default to model panel if we can't determine
        detectedType = "model";
      }

      logger.log(`Detected panel type: ${detectedType}`);
      logger.debug(`Detected panel type: ${detectedType}`);
      dispatch({ type: "APP_INITIALIZE", panelType: detectedType });
    }
  }, [initialPanelType, state.app.initialized, dispatch]);
}

/**
 * Effect for setting up a safety timeout for auth initialization
 */
export function useAuthTimeoutEffect(
  state: { auth: { silentAuthInProgress: boolean; isAuthenticated: boolean; userInfo?: any } },
  dispatch: React.Dispatch<any>,
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any },
  authTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  authLoadingCycleCompletedRef: React.MutableRefObject<boolean>,
  authInitializedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    // Clear any existing timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    
    // Set up new timeout - If auth hasn't completed within 10 seconds, proceed anyway
    authTimeoutRef.current = setTimeout(() => {
      if (!authLoadingCycleCompletedRef.current) {
        logger.warn("Auth initialization timeout reached. Forcing auth initialized state to proceed.");
        logger.warn("Auth initialization timeout reached after 10 seconds!");
        
        // Check for valid auth
        const { isAuthenticated, userInfo } = ensureAuthState();
        
        logger.warn("Current auth state:", {
          silentAuthInProgress: state.auth.silentAuthInProgress,
          isAuthenticated: isAuthenticated,
          hasUserInfo: !!userInfo
        });
        
        // Force auth to be considered initialized
        authInitializedRef.current = true;
        authLoadingCycleCompletedRef.current = true;
        
        // If auth is loading, force it to not loading
        if (state.auth.silentAuthInProgress) {
          dispatch({
            type: 'AUTH_LOADING',
            silentAuthInProgress: false
          });
          
          // Also ensure lastUpdated is set
          dispatch({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: isAuthenticated,
            userInfo: userInfo
          });
        }
      }
    }, 10000); // 10 seconds timeout
    
    // Clean up timeout on unmount
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [ensureAuthState, state.auth.silentAuthInProgress, dispatch, authTimeoutRef, authLoadingCycleCompletedRef, authInitializedRef]);
}
