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
ComponentLogger.setEnabled(LOG_PREFIX, true);

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

    // Get fresh token, force a refresh to ensure we have the latest token
    let retryCount = 0;
    let token: string | null = null;
    
    // Try up to 3 times to get a valid token
    while (retryCount < 3 && !token) {
      try {
        ComponentLogger.log(LOG_PREFIX, `Attempt ${retryCount + 1} to acquire token`);
        token = await getAccessToken();
        if (!token) {
          ComponentLogger.warn(LOG_PREFIX, 'No token returned from getAccessToken()');
          retryCount++;
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        ComponentLogger.error(LOG_PREFIX, `Error getting token on attempt ${retryCount + 1}:`, e);
        retryCount++;
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!token) {
      ComponentLogger.error(LOG_PREFIX, 'Failed to get valid token after multiple attempts');
      updateAuthState({ error: 'Failed to acquire authentication token' });
      return null;
    }

    // Validate token format and check expiration
    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      ComponentLogger.error(LOG_PREFIX, 'Invalid token format');
      updateAuthState({ error: 'Invalid authentication token format' });
      return null;
    }
    
    let tokenPayload: any;
    try {
      tokenPayload = JSON.parse(atob(tokenParts[1]));
      
      // Check token required fields
      if (!tokenPayload.exp || !tokenPayload.aud) {
        ComponentLogger.error(LOG_PREFIX, 'Token missing required fields');
        updateAuthState({ error: 'Invalid token structure' });
        return null;
      }
      
      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (tokenPayload.exp < now) {
        ComponentLogger.error(LOG_PREFIX, 'Token is expired', {
          expiration: new Date(tokenPayload.exp * 1000).toISOString(),
          now: new Date(now * 1000).toISOString()
        });
        updateAuthState({ error: 'Authentication token is expired' });
        return null;
      }
      
      // Log token payload with sensitive data redacted
      ComponentLogger.log(LOG_PREFIX, 'Token validated successfully. Payload (redacted):', {
        aud: tokenPayload.aud,
        iss: tokenPayload.iss,
        exp: new Date(tokenPayload.exp * 1000).toISOString(),
        iat: tokenPayload.iat ? new Date(tokenPayload.iat * 1000).toISOString() : 'missing',
        sub: tokenPayload.sub ? '***redacted***' : 'missing',
        name: tokenPayload.name ? '***redacted***' : 'missing',
        email: tokenPayload.emails?.[0] ? '***redacted***' : 'missing',
        preferred_username: tokenPayload.preferred_username ? '***redacted***' : 'missing',
      });
    } catch (e) {
      ComponentLogger.error(LOG_PREFIX, 'Error parsing token payload:', e);
      updateAuthState({ error: 'Failed to parse authentication token' });
      return null;
    }

    try {
      ComponentLogger.log(LOG_PREFIX, 'Syncing user with quodsi-fastapi');
      
      // Get user identifier from token - try different fields that might contain email
      let tokenUserIdentifier = 'unknown';
      if (tokenPayload.emails && Array.isArray(tokenPayload.emails) && tokenPayload.emails.length > 0) {
        tokenUserIdentifier = tokenPayload.emails[0];
      } else if (tokenPayload.preferred_username) {
        tokenUserIdentifier = tokenPayload.preferred_username;
      } else if (tokenPayload.email) {
        tokenUserIdentifier = tokenPayload.email;
      } else if (tokenPayload.upn) {
        tokenUserIdentifier = tokenPayload.upn; // User Principal Name sometimes available in tokens
      }
      
      ComponentLogger.log(LOG_PREFIX, `User identifier from token: ${tokenUserIdentifier}`);
      
      const syncResponse = await userSyncService.syncUser(token);

      if (syncResponse) {
        ComponentLogger.log(LOG_PREFIX, 'User synced successfully:', syncResponse);
        ComponentLogger.log(LOG_PREFIX, `Backend user email: ${syncResponse.email}`);
        
        // Verify the synced user matches the token identity
        // Only perform this check if we have a clear identifier (not 'unknown')
        if (tokenUserIdentifier !== 'unknown' && syncResponse.email) {
          // Normalize emails for comparison (lowercase, trim)
          const normalizedTokenId = tokenUserIdentifier.toLowerCase().trim();
          const normalizedSyncEmail = syncResponse.email.toLowerCase().trim();
          
          // Check if the emails match
          if (normalizedTokenId !== normalizedSyncEmail) {
            ComponentLogger.error(LOG_PREFIX, 'User identity mismatch!', {
              tokenIdentifier: normalizedTokenId,
              syncedEmail: normalizedSyncEmail
            });
            
            // Log complete token payload for debugging (with sensitive data redacted)
            ComponentLogger.log(LOG_PREFIX, 'Token payload for debugging identity mismatch:', {
              // Standard fields
              aud: tokenPayload.aud,
              iss: tokenPayload.iss,
              exp: tokenPayload.exp ? new Date(tokenPayload.exp * 1000).toISOString() : null,
              // Identity fields (redacted)
              sub: tokenPayload.sub ? '***redacted***' : 'missing',
              name: tokenPayload.name ? '***redacted***' : 'missing',
              emails: tokenPayload.emails ? '[redacted]' : 'missing',
              email: tokenPayload.email ? '***redacted***' : 'missing',
              preferred_username: tokenPayload.preferred_username ? '***redacted***' : 'missing',
              upn: tokenPayload.upn ? '***redacted***' : 'missing',
              // Include token version and type if available
              ver: tokenPayload.ver,
              typ: tokenPayload.typ
            });
            
            updateAuthState({ error: 'User identity verification failed - token identity does not match backend user' });
            return null;
          }
        }

        // After successful sync, initialize a session if one doesn't exist
        await initializeSession();

        // Notify extension about successful auth
        if (userInfo) {
          authMessagingService.sendAuthCompleted(true, userInfo);
        }
      } else {
        // If sync returns null but no error was thrown, check if we have userInfo
        if (userInfo) {
          ComponentLogger.log(LOG_PREFIX, 'Sync response was null, but continuing with existing userInfo');
          authMessagingService.sendAuthCompleted(true, userInfo);
        } else {
          ComponentLogger.error(LOG_PREFIX, 'Sync response was null and no userInfo exists');
          authMessagingService.sendAuthCompleted(false, null);
          return null;
        }
      }

      return syncResponse;
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error syncing user with backend:', error);

      // Convert to standardized error
      const authError = authErrorHandler.createUserSyncError(error);

      // Display error to the user - convert AuthError to string
      updateAuthState({ error: authError.message || 'User synchronization failed' });

      // Notify about error
      authMessagingService.sendAuthError(authError);

      // IMPORTANT: For backend sync failures, we should NOT proceed with authentication
      // if the user doesn't already exist in the backend
      if (userInfo) {
        ComponentLogger.log(LOG_PREFIX, 'Backend sync failed for existing user, continuing with local auth');
        authMessagingService.sendAuthCompleted(true, userInfo);
      } else {
        ComponentLogger.error(LOG_PREFIX, 'Backend sync failed for new user, aborting authentication');
        authMessagingService.sendAuthCompleted(false, null);
      }

      return null;
    }
  }, [isAuthenticated, getAccessToken, userInfo, initializeSession, updateAuthState]);

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
