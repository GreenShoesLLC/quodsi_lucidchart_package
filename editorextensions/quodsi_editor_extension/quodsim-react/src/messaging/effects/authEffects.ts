import { useEffect } from 'react';
import { debugService } from '../utils/debugService';

const logger = debugService.forComponent('AuthEffects');

/**
 * Effect for tracking when auth has completed initialization
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
 * Effect for tracking when auth loading cycle has completed
 */
export function useAuthLoadingCycleEffect(
  state: { auth: { isLoading: boolean; lastUpdated?: number } },
  authLoadingCycleCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    if (!authLoadingCycleCompletedRef.current && state.auth.isLoading === false && state.auth.lastUpdated) {
      logger.log("Setting authLoadingCycleCompletedRef based on isLoading=false and lastUpdated presence");
      console.log("[REACT][AuthEffects] Setting authLoadingCycleCompletedRef=true based on isLoading=false and lastUpdated");
      authLoadingCycleCompletedRef.current = true;
    }
  }, [state.auth.isLoading, state.auth.lastUpdated, authLoadingCycleCompletedRef]);
}

/**
 * Effect for tracking auth state changes and logging them
 */
export function useAuthStateChangeEffect(
  state: { auth: { isLoading: boolean; isAuthenticated: boolean; userInfo?: any; lastUpdated?: number } },
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any },
  authInitializedRef: React.MutableRefObject<boolean>,
  authLoadingCycleCompletedRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    logger.log("Auth loading state changed:", {
      isLoading: state.auth.isLoading,
      isAuthenticated: state.auth.isAuthenticated,
      hasUserInfo: !!state.auth.userInfo,
      lastUpdated: state.auth.lastUpdated
    });
    
    console.log("[REACT][AuthEffects] Auth loading state changed:", {
      isLoading: state.auth.isLoading,
      isAuthenticated: state.auth.isAuthenticated,
      hasUserInfo: !!state.auth.userInfo,
      lastUpdated: state.auth.lastUpdated ? new Date(state.auth.lastUpdated).toISOString() : 'undefined'
    });
    
    // If we see loading change from true to false AND we have a lastUpdated timestamp
    // this means auth has gone through a complete initialization cycle
    if (state.auth.isLoading === false && state.auth.lastUpdated) {
      logger.log("Auth initialization cycle complete, state:", {
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo,
        isLoading: state.auth.isLoading,
        lastUpdated: new Date(state.auth.lastUpdated).toISOString()
      });
      
      console.log("[REACT][AuthEffects] Auth initialization cycle complete!", {
        isAuthenticated: state.auth.isAuthenticated,
        hasUserInfo: !!state.auth.userInfo,
        isLoading: state.auth.isLoading,
        lastUpdated: new Date(state.auth.lastUpdated).toISOString()
      });
      
      // Ensure auth state (check localStorage)
      ensureAuthState();
      
      authInitializedRef.current = true;
      authLoadingCycleCompletedRef.current = true;
      
      // Log the state of authInitializedRef and authLoadingCycleCompletedRef
      logger.log("Auth refs updated:", {
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: authLoadingCycleCompletedRef.current
      });
      
      console.log("[REACT][AuthEffects] Auth refs updated:", {
        authInitialized: authInitializedRef.current,
        authLoadingCycleCompleted: authLoadingCycleCompletedRef.current
      });
    }
  }, [state.auth.isLoading, state.auth.lastUpdated, state.auth.isAuthenticated, state.auth.userInfo, 
      ensureAuthState, authInitializedRef, authLoadingCycleCompletedRef]);
}

/**
 * Effect for checking localStorage at component initialization
 */
export function useInitialAuthCheckEffect(
  ensureAuthState: () => { isAuthenticated: boolean; userInfo: any }
) {
  useEffect(() => {
    console.log("[REACT][AuthEffects] Performing initial auth state check");
    ensureAuthState();
  }, [ensureAuthState]);
}
