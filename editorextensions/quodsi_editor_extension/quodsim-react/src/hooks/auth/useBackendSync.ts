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
      console.warn('[useBackendSync] Cannot sync user - not authenticated');
      return null;
    }
    
    // Get token
    const token = await getAccessToken();
    if (!token) {
      console.warn('[useBackendSync] Cannot sync user - no token available');
      return null;
    }
    
    try {
      console.log('[useBackendSync] Syncing user with quodsi-fastapi');
      const syncResponse = await userSyncService.syncUser(token);
      
      if (syncResponse) {
        console.log('[useBackendSync] User synced successfully:', syncResponse);
        
        // After successful sync, initialize a session if one doesn't exist
        await initializeSession();
        
        // Notify extension about successful auth
        if (userInfo) {
          authMessagingService.sendAuthCompleted(true, userInfo);
        }
      }
      
      return syncResponse;
    } catch (error) {
      console.error('[useBackendSync] Error syncing user with backend:', error);
      
      // Convert to standardized error
      const authError = authErrorHandler.createUserSyncError(error);
      
      // Notify about error (but don't set local error state)
      authMessagingService.sendAuthError(authError);
      
      return null;
    }
  }, [isAuthenticated, getAccessToken, userInfo, initializeSession]);

  // Get user profile from backend
  const getUserProfile = useCallback(async (): Promise<UserProfileResponse | null> => {
    if (!isAuthenticated) {
      console.warn('[useBackendSync] Cannot get profile - not authenticated');
      return null;
    }
    
    // Get token
    const token = await getAccessToken();
    if (!token) {
      console.warn('[useBackendSync] Cannot get profile - no token available');
      return null;
    }
    
    try {
      return await userSyncService.getUserProfile(token);
    } catch (error) {
      console.error('[useBackendSync] Error getting user profile:', error);
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
