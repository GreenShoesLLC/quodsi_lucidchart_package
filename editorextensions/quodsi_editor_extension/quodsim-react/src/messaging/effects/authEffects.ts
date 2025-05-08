import { useEffect } from 'react';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('AuthEffects');

/**
 * Effect for tracking when auth has completed initialization
 * 
 * Purpose:
 * - Sets authInitializedRef to true when auth has received its first real update
 * - Uses the presence of a lastUpdated timestamp as evidence that auth is initialized
 * - Helps track the completion of the auth initialization process
 * 
 * Trigger:
 * - First time state.auth.lastUpdated becomes non-undefined
 * 
 * Key Action:
 * - Sets authInitializedRef.current = true only once when auth gets initialized
 */
export function useAuthInitializationEffect(
  state: { auth: { lastUpdated?: number } },
  authInitializedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!authInitializedRef.current && state.auth.lastUpdated) {
      logger.log("Setting authInitializedRef based on lastUpdated presence");
      console.log("[REACT][AuthEffects] Setting authInitializedRef=true based on lastUpdated presence");
      authInitializedRef.current = true;
    }
  }, [state.auth.lastUpdated, authInitializedRef]);
}

/**
 * Effect for tracking when silent auth process has completed
 * 
 * Purpose:
 * - Sets silentAuthCheckCompletedRef to true when silent auth check completes
 * - Requires both silentAuthInProgress=false AND lastUpdated is defined
 * - Tracks the specific completion of the silent authentication process
 * 
 * Trigger:
 * - When silent auth stops (silentAuthInProgress=false) AND
 * - Auth state has been updated at least once (lastUpdated is defined)
 * 
 * Key Action:
 * - Sets silentAuthCheckCompletedRef.current = true only once when silent auth completes
 */
export function useSilentAuthCompletionEffect(
  state: { auth: { silentAuthInProgress: boolean; lastUpdated?: number } },
  silentAuthCheckCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!silentAuthCheckCompletedRef.current && state.auth.silentAuthInProgress === false && state.auth.lastUpdated) {
      logger.log("Setting silentAuthCheckCompletedRef based on silentAuthInProgress=false and lastUpdated presence");
      console.log("[REACT][AuthEffects] Setting silentAuthCheckCompletedRef=true based on silentAuthInProgress=false and lastUpdated");
      silentAuthCheckCompletedRef.current = true;
    }
  }, [state.auth.silentAuthInProgress, state.auth.lastUpdated, silentAuthCheckCompletedRef]);
}

/**
 * Effect for tracking auth state changes and handling auth lifecycle events
 * 
 * Purpose:
 * - Provides comprehensive monitoring of auth state changes
 * - Logs detailed information about auth state transitions
 * - Calls ensureAuthState() when silent auth completes to check localStorage
 * - Sets BOTH refs (authInitializedRef and silentAuthCheckCompletedRef) to true
 * - Acts as a redundant safety mechanism for setting auth completion flags
 * 
 * Trigger:
 * - Any changes to auth state (silentAuthInProgress, lastUpdated, isAuthenticated, userInfo)
 * 
 * Key Actions:
 * - Logs detailed auth state changes for debugging
 * - Calls ensureAuthState() when silent auth completes
 * - Sets both auth ref flags to ensure initialization is tracked properly
 * - Provides redundancy with other auth effects for reliability
 */
export function useAuthStateChangeEffect(
  state: { auth: { silentAuthInProgress: boolean; isAuthenticated: boolean; userInfo?: any; lastUpdated?: number } },
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any },
  authInitializedRef: React.MutableRefObject<boolean>,
  silentAuthCheckCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    logger.log("Auth loading state changed:", {
      silentAuthInProgress: state.auth.silentAuthInProgress,
      isAuthenticated: state.auth.isAuthenticated,
      hasUserInfo: !!state.auth.userInfo,
      lastUpdated: state.auth.lastUpdated
    });

    console.log("[REACT][AuthEffects] Auth loading state changed:", {
      silentAuthInProgress: state.auth.silentAuthInProgress,
      isAuthenticated: state.auth.isAuthenticated,
      hasUserInfo: !!state.auth.userInfo,
      lastUpdated: state.auth.lastUpdated ? new Date(state.auth.lastUpdated).toISOString() : 'undefined'
    });

    // If we see loading change from true to false AND we have a lastUpdated timestamp
    // this means auth has gone through a complete initialization cycle
    if (state.auth.silentAuthInProgress === false && state.auth.lastUpdated) {
      logger.log("Auth initialization cycle complete, state:", {
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo,
        silentAuthInProgress: state.auth.silentAuthInProgress,
        lastUpdated: new Date(state.auth.lastUpdated).toISOString()
      });

      console.log("[REACT][AuthEffects] Auth initialization cycle complete!", {
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo,
        silentAuthInProgress: state.auth.silentAuthInProgress,
        lastUpdated: new Date(state.auth.lastUpdated).toISOString()
      });

      // Ensure auth state (check localStorage)
      ensureAuthState();

      authInitializedRef.current = true;
      silentAuthCheckCompletedRef.current = true;

      // Log the state of authInitializedRef and silentAuthCheckCompletedRef
      logger.log("Auth refs updated:", {
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: silentAuthCheckCompletedRef.current
      });

      console.log("[REACT][AuthEffects] Auth refs updated:", {
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: silentAuthCheckCompletedRef.current
      });
    }
  }, [state.auth.silentAuthInProgress, state.auth.lastUpdated, state.auth.isAuthenticated, state.auth.userInfo,
    ensureAuthState, authInitializedRef, silentAuthCheckCompletedRef]);
}

/**
 * Effect for checking localStorage at component initialization
 * 
 * Purpose:
 * - Performs a single check of localStorage at component mount time
 * - Ensures auth state is initialized with any stored authentication data
 * - Runs exactly once when the component mounts
 * 
 * Trigger:
 * - Component mount (runs exactly once due to empty dependency array)
 * 
 * Key Action:
 * - Calls ensureAuthState() which checks localStorage and updates Redux state if needed
 */
export function useInitialAuthCheckEffect(
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any }
) {
  useEffect(() => {
    console.log("[REACT][AuthEffects] Performing initial auth state check");
    ensureAuthState();
  }, [ensureAuthState]);
}
