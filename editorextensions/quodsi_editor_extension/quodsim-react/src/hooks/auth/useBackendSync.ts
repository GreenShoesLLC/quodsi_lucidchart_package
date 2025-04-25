/**
 * useBackendSync Hook
 * 
 * Handles synchronization with quodsi-fastapi backend
 */

import { useCallback, useEffect } from 'react';
import { useAuthState } from './useAuthState';
import { useTokenManager } from './useTokenManager';
import { useAuthSession } from './useAuthSession';
import { userSyncService, UserSyncResponse, UserProfileResponse } from '../../services/UserSyncService';
import { authErrorHandler } from '../../services/AuthErrorHandler';
import { authMessagingService } from '../../services/AuthMessagingService';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[useBackendSync]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Helper function to enable/disable logging for this hook
 */
export const setBackendSyncLogging = (enabled: boolean): void => {
  ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

// Define the BackendSync interface
export interface BackendSync {
  syncUserWithBackend: () => Promise<UserSyncResponse | null>;
  getUserProfile: () => Promise<UserProfileResponse | null>;
}

/**
 * useBackendSync hook for backend synchronization
 */
export function useBackendSync(): BackendSync {
  const { isAuthenticated, userInfo, updateAuthState } = useAuthState();
  const { getAccessToken } = useTokenManager();
  const { initializeSession } = useAuthSession();

  // Sync user with quodsi-fastapi
  const syncUserWithBackend = useCallback(async (): Promise<UserSyncResponse | null> => {
    if (!isAuthenticated) {
      ComponentLogger.warn(LOG_PREFIX, 'Cannot sync user - not authenticated');
      return null;
    }
    
    // Get token
    const token = await getAccessToken();
    if (!token) {
      ComponentLogger.warn(LOG_PREFIX, 'Cannot sync user - no token available');
      return null;
    }
    
    try {
      ComponentLogger.log(LOG_PREFIX, 'Syncing user with quodsi-fastapi');
      const syncResponse = await userSyncService.syncUser(token);
      
      if (syncResponse) {
        ComponentLogger.log(LOG_PREFIX, 'User synced successfully:', syncResponse);
        
        // After successful sync, initialize a session if one doesn't exist
        await initializeSession();
        
        // Notify extension about successful auth
        if (userInfo) {
          authMessagingService.sendAuthCompleted(true, userInfo);
        }
      } else {
        // Even if sync response is empty but no error was thrown,
        // we should still consider authentication successful
        if (userInfo) {
          authMessagingService.sendAuthCompleted(true, userInfo);
        }
      }
      
      return syncResponse;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error syncing user with backend:', error);
      
      // Convert to standardized error
      const authError = authErrorHandler.createUserSyncError(error);
      // IMPORTANT: Even with backend sync failure, if we have a valid
      // MSAL authentication, we should still complete the auth flow
      if (userInfo) {
        ComponentLogger.log(LOG_PREFIX, 'Backend sync failed but continuing with local auth');
        authMessagingService.sendAuthCompleted(true, userInfo);
      }
      // Notify about error (but don't set local error state)
      authMessagingService.sendAuthError(authError);
      
      return null;
    }
  }, [isAuthenticated, getAccessToken, userInfo, initializeSession]);

  // Get user profile from backend
  const getUserProfile = useCallback(async (): Promise<UserProfileResponse | null> => {
    if (!isAuthenticated) {
      ComponentLogger.warn(LOG_PREFIX, 'Cannot get profile - not authenticated');
      return null;
    }
    
    // Get token
    const token = await getAccessToken();
    if (!token) {
      ComponentLogger.warn(LOG_PREFIX, 'Cannot get profile - no token available');
      return null;
    }
    
    try {
      return await userSyncService.getUserProfile(token);
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error getting user profile:', error);
      return null;
    }
  }, [isAuthenticated, getAccessToken]);

  // Sync user with backend when authenticated state changes
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      syncUserWithBackend();
    }
  }, [isAuthenticated, userInfo, syncUserWithBackend]);

  return {
    syncUserWithBackend,
    getUserProfile
  };
}
