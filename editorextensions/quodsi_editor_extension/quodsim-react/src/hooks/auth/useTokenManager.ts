/**
 * useTokenManager Hook
 * 
 * Handles token acquisition, validation, and refresh
 */

import { useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { 
  InteractionRequiredAuthError, 
  SilentRequest,
  AccountInfo
} from '@azure/msal-browser';
import { loginRequest, TOKEN_REFRESH_BUFFER_MS } from '../../auth/config';
import { sessionStorageService } from '../../services/SessionStorageService';
import { authErrorHandler } from '../../services/AuthErrorHandler';
import { useAuthState } from './useAuthState';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[useTokenManager]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, true);

/**
 * Helper function to enable/disable logging for this hook
 */
export const setTokenManagerLogging = (enabled: boolean): void => {
  ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

// Define the token response interface
export interface TokenResponse {
  accessToken: string;
  idToken: string;
  expiresOn: Date | null;
  account: AccountInfo;
  scopes: string[];
}

// Define the TokenManager interface
export interface TokenManager {
  accessToken: string | null;
  tokenExpiration: Date | null;
  acquireTokenSilently: () => Promise<TokenResponse | null>;
  getAccessToken: () => Promise<string | null>;
  refreshTokenIfNeeded: () => Promise<boolean>;
  isTokenExpiringSoon: () => boolean;
  clearTokens: () => void;
}

/**
 * useTokenManager hook for handling token acquisition and management
 */
export function useTokenManager(): TokenManager {
  const { instance, accounts } = useMsal();
  const { isAuthenticated, userInfo, isMsalInitialized, setError } = useAuthState();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);

  // Initialize token from session storage if available
  useEffect(() => {
    if (isMsalInitialized && isAuthenticated) {
      try {
        const storedState = sessionStorageService.loadSessionState();
        
        if (storedState && storedState.accessToken && storedState.tokenExpiration) {
          ComponentLogger.log(LOG_PREFIX, 'Loading token from session storage');
          setAccessToken(storedState.accessToken);
          setTokenExpiration(new Date(storedState.tokenExpiration));
        }
      } catch (loadError) {
        ComponentLogger.error(LOG_PREFIX, 'Error loading token from session storage:', loadError);
      }
    }
  }, [isMsalInitialized, isAuthenticated]);

  // Get active token silently
  const acquireTokenSilently = useCallback(async (): Promise<TokenResponse | null> => {
    // Ensure MSAL is initialized before attempting to acquire token
    if (!isMsalInitialized) {
      ComponentLogger.log(LOG_PREFIX, 'MSAL not yet initialized, cannot acquire token');
      return null;
    }
  
    if (accounts.length === 0) {
      ComponentLogger.log(LOG_PREFIX, 'No accounts available, cannot acquire token');
      return null;
    }
    
    try {
      ComponentLogger.log(LOG_PREFIX, 'Acquiring token silently');
      const request: SilentRequest = {
        ...loginRequest,
        account: accounts[0]
      };
      
      const response = await instance.acquireTokenSilent(request);
      ComponentLogger.log(LOG_PREFIX, 'Token acquired successfully');
      
      // Update state with new token information
      setAccessToken(response.accessToken);
      setTokenExpiration(response.expiresOn);
      
      // Save token to session storage if we have user info
      if (userInfo) {
        sessionStorageService.saveSessionState({
          isAuthenticated: true,
          userInfo,
          accessToken: response.accessToken,
          tokenExpiration: response.expiresOn,
          lastActive: Date.now()
        });
      }
      
      return {
        accessToken: response.accessToken,
        idToken: response.idToken,
        expiresOn: response.expiresOn,
        account: response.account,
        scopes: response.scopes
      };
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Silent token acquisition failed', error);
      
      // Handle the case where silent authentication fails
      if (error instanceof InteractionRequiredAuthError) {
        // User needs to re-authenticate, don't automatically start popup
        return null;
      }
      
      // Convert to standardized error
      const authError = authErrorHandler.handleMsalError(error);
      setError(authError.message);
      throw authError;
    }
  }, [instance, accounts, isMsalInitialized, userInfo, setError]);

  // Check if token is expiring soon (within refresh buffer period)
  const isTokenExpiringSoon = useCallback((): boolean => {
    // If there's no token expiration, treat it as if it's expiring
    if (!tokenExpiration) {
      return true;
    }
    
    const now = new Date();
    return tokenExpiration.getTime() - now.getTime() < TOKEN_REFRESH_BUFFER_MS;
  }, [tokenExpiration]);

  // Refresh token if needed
  const refreshTokenIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      return false; // Not authenticated, can't refresh
    }
    
    // Check if token is expiring soon or missing
    if (!tokenExpiration || isTokenExpiringSoon()) {
      try {
        const tokenResponse = await acquireTokenSilently();
        if (tokenResponse) {
          return true;
        }
        return false;
      } catch (error) {
        ComponentLogger.error(LOG_PREFIX, 'Token refresh failed', error);
        return false;
      }
    }
    
    return true; // Token is valid, no need to refresh
  }, [isAuthenticated, tokenExpiration, isTokenExpiringSoon, acquireTokenSilently]);

  // Function to get a fresh token for API calls
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) {
      ComponentLogger.warn(LOG_PREFIX, 'Cannot get token - not authenticated');
      return null;
    }
    
    // Check if we need to refresh the token
    if (!tokenExpiration || isTokenExpiringSoon()) {
      const refreshed = await refreshTokenIfNeeded();
      if (!refreshed) {
        ComponentLogger.warn(LOG_PREFIX, 'Token refresh failed');
        return null;
      }
    }
    
    // Update session activity timestamp
    sessionStorageService.updateLastActive();
    
    return accessToken;
  }, [isAuthenticated, accessToken, tokenExpiration, isTokenExpiringSoon, refreshTokenIfNeeded]);

  // Set up a token refresh timer
  useEffect(() => {
    // If authenticated and we have a token expiration
    if (isAuthenticated && tokenExpiration) {
      // Calculate time until we need to refresh (refresh buffer before expiration)
      const now = new Date();
      const refreshTime = new Date(tokenExpiration.getTime() - TOKEN_REFRESH_BUFFER_MS);
      const timeUntilRefresh = Math.max(0, refreshTime.getTime() - now.getTime());
      
      // Set up timer to refresh token
      const timerId = setTimeout(() => {
        ComponentLogger.log(LOG_PREFIX, 'Token refresh timer triggered');
        refreshTokenIfNeeded();
      }, timeUntilRefresh);
      
      // Clean up timer
      return () => clearTimeout(timerId);
    }
  }, [isAuthenticated, tokenExpiration, refreshTokenIfNeeded]);

  // Clear tokens method
  const clearTokens = useCallback(() => {
    setAccessToken(null);
    setTokenExpiration(null);
  }, []);

  return {
    accessToken,
    tokenExpiration,
    acquireTokenSilently,
    getAccessToken,
    refreshTokenIfNeeded,
    isTokenExpiringSoon,
    clearTokens
  };
}
