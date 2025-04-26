/**
 * useAuthOperations Hook
 * 
 * Implements sign-in, sign-out, password reset functions
 */

import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { 
  loginRequest, 
  passwordResetRequest, 
  profileEditRequest 
} from '../../auth/config';
import { useAuthState } from './useAuthState';
import { useTokenManager } from './useTokenManager';
import { sessionStorageService } from '../../services/SessionStorageService';
import { authMessagingService } from '../../services/AuthMessagingService';
import { authErrorHandler, AuthErrorCode } from '../../services/AuthErrorHandler';
import { useAuthSession } from './useAuthSession';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[useAuthOperations]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, false);

/**
 * Helper function to enable/disable logging for this hook
 */
export const setAuthOperationsLogging = (enabled: boolean): void => {
  ComponentLogger.setEnabled(LOG_PREFIX, enabled);
};

// Define the AuthOperations interface
export interface AuthOperations {
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handlePasswordReset: () => Promise<void>;
  handleEditProfile: () => Promise<void>;
  clearExistingSession: () => void;
}

/**
 * useAuthOperations hook for authentication operations
 */
export function useAuthOperations(): AuthOperations {
  const { instance, inProgress } = useMsal();
  const { 
    isAuthenticated, 
    setIsAuthenticated, 
    setUserInfo, 
    setError, 
    isProcessingAuth, 
    setIsProcessingAuth,
    isMsalInitialized,
    updateAuthState
  } = useAuthState();
  const { clearTokens } = useTokenManager();
  const { endCurrentSession } = useAuthSession();

  // Clear any existing login session data
  const clearExistingSession = useCallback(() => {
    try {
      // Clear local state
      updateAuthState({
        isAuthenticated: false,
        userInfo: null,
        error: null
      });
      
      // Clear tokens
      clearTokens();
      
      // Clear session storage
      sessionStorageService.clearSessionState();
      sessionStorageService.clearMsalCache();
      
      ComponentLogger.log(LOG_PREFIX, 'Cleared existing session data');
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Error clearing session data:', error);
    }
  }, [updateAuthState, clearTokens]);

  // Handle sign-in
  const handleSignIn = useCallback(async () => {
    if (isProcessingAuth) return;
    
    ComponentLogger.log(LOG_PREFIX, 'Sign in requested');
    setIsProcessingAuth(true);
    setError(null);

    try {
      // Check if MSAL is initialized
      if (!isMsalInitialized) {
        ComponentLogger.log(LOG_PREFIX, 'MSAL not initialized yet, waiting...');
        await new Promise(resolve => {
          // Wait for a maximum of 3 seconds for initialization
          const timeout = setTimeout(() => {
            ComponentLogger.log(LOG_PREFIX, 'MSAL initialization timeout reached');
            resolve(null);
          }, 3000);
          
          // Check every 100ms if MSAL is ready
          const checkInterval = setInterval(() => {
            if (inProgress === 'none') {
              ComponentLogger.log(LOG_PREFIX, 'MSAL is now initialized');
              clearTimeout(timeout);
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 100);
        });
      }

      // Notify extension that sign-in is starting
      authMessagingService.sendSignInStarted();

      // Ensure we start with a clean state by:
      // 1. Check for any existing MSAL accounts
      const existingAccounts = instance.getAllAccounts();
      if (existingAccounts.length > 0) {
        ComponentLogger.log(LOG_PREFIX, `Found ${existingAccounts.length} existing accounts, clearing cache to remove them`);
        
        // Clear MSAL cache to remove existing accounts
        sessionStorageService.clearMsalCache();
        
        // Verify accounts were cleared
        const remainingAccounts = instance.getAllAccounts();
        if (remainingAccounts.length > 0) {
          ComponentLogger.log(LOG_PREFIX, `${remainingAccounts.length} accounts still remain after cache clearing`);
        } else {
          ComponentLogger.log(LOG_PREFIX, 'Successfully cleared all MSAL accounts');
        }
      }
      
      // 2. Clear all session storage and cache
      sessionStorageService.clearSessionState();
      sessionStorageService.clearMsalCache();
      
      // 3. Reset local state
      updateAuthState({
        isAuthenticated: false,
        userInfo: null,
        error: null
      });
      clearTokens();

      // Prepare login options with prompt=login to force fresh authentication
      const loginOptions = {
        ...loginRequest,
        prompt: 'login' // Force login prompt to avoid any cached sessions
      };

      ComponentLogger.log(LOG_PREFIX, 'Initiating loginPopup with prompt=login');
      // ALWAYS use standard MSAL popup flow with prompt=login
      const response = await instance.loginPopup(loginOptions);
      // Log successful login with redacted info
      ComponentLogger.log(LOG_PREFIX, 'Login successful', {
        accessTokenLength: response.accessToken ? response.accessToken.length : 0,
        idTokenLength: response.idToken ? response.idToken.length : 0,
        hasAccount: response.account ? 'yes' : 'no',
        expiresOn: response.expiresOn ? response.expiresOn.toISOString() : 'no expiration'
      });
      
      // IMPORTANT: After successful login, update the auth state
      if (response?.account) {
        const userInfo = {
          name: response.account.name || response.account.username,
          email: response.account.username
        };

        // Update local state
        updateAuthState({
          isAuthenticated: true,
          userInfo,
          error: null
        });
        
        // Calculate token expiration - handle null case
        let tokenExpiration: Date;
        if (response.expiresOn) {
          // If expiresOn is available, use it
          tokenExpiration = new Date(response.expiresOn);
        } else {
          // Default to 1 hour from now if expiresOn is null
          tokenExpiration = new Date(Date.now() + 3600 * 1000);
          ComponentLogger.log(LOG_PREFIX, 'No expiration time in token, using default 1 hour');
        }
        
        // Save to session storage
        sessionStorageService.saveSessionState({
          isAuthenticated: true,
          userInfo,
          accessToken: response.accessToken,
          tokenExpiration: tokenExpiration,
          lastActive: Date.now()
        });

        // Notify extension about successful auth
        authMessagingService.sendAuthCompleted(true, userInfo);
      } else {
        ComponentLogger.error(LOG_PREFIX, 'Login response missing account information');
        throw new Error('Login response missing account information');
      }
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Login failed', error);
      
      // Clear any partial state that might have been set
      clearExistingSession();
      
      // Convert to standardized error
      const authError = authErrorHandler.handleMsalError(error);
      setError(authError.message);

      // Notify extension about auth error
      authMessagingService.sendAuthError(authError);
    } finally {
      setIsProcessingAuth(false);
    }
  }, [
    instance, 
    isProcessingAuth, 
    isMsalInitialized, 
    inProgress, 
    setIsProcessingAuth, 
    setError,
    clearExistingSession,
    clearTokens,
    updateAuthState
  ]);

  // Handle sign-out
  const handleSignOut = useCallback(async () => {
    if (isProcessingAuth) return;
    
    ComponentLogger.log(LOG_PREFIX, 'Sign out requested');
    setIsProcessingAuth(true);

    try {
      // End session on backend first
      await endCurrentSession();
      
      // Clear local state
      setIsAuthenticated(false);
      setUserInfo(null);
      clearTokens();
      
      // Then notify extension about sign-out
      authMessagingService.sendSignOut();
      
      // Clear any cached sessions
      clearExistingSession();
      
      // Use popup for logout (more reliable in iframe environments)
      try {
        // Force prompt on next login by setting prompt="login" in the logout options
        await instance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
          mainWindowRedirectUri: window.location.origin,
        });
        window.location.reload();
        ComponentLogger.log(LOG_PREFIX, 'MSAL logout popup completed successfully');
      } catch (e) {
        ComponentLogger.error(LOG_PREFIX, 'Popup logout failed, clearing MSAL cache manually', e);
        // If popup logout fails, we need to make sure MSAL cache is completely cleared
        try {
          // MSAL doesn't have a direct removeAccount method, so we'll use the logout methods
          // and then make sure we clear the cache completely
          ComponentLogger.log(LOG_PREFIX, 'Failed to logout via popup, using additional cleanup methods');
          
          // Force manual clearing of accounts from MSAL cache
          sessionStorageService.clearMsalCache();
          sessionStorageService.clearSessionState();
          window.location.reload();
          // Log accounts that remain after clearing
          const remainingAccounts = instance.getAllAccounts();
          if (remainingAccounts.length > 0) {
            ComponentLogger.log(LOG_PREFIX, `${remainingAccounts.length} accounts still remain in MSAL cache after clearing`);
          } else {
            ComponentLogger.log(LOG_PREFIX, 'Successfully cleared all MSAL accounts');
          }
        } catch (accountError) {
          ComponentLogger.error(LOG_PREFIX, 'Error during account cleanup', accountError);
        }
      }
      
      // Ensure sessionStorage and localStorage are fully cleared of auth data
      sessionStorageService.clearMsalCache();
      
      // Force reload window.location to ensure clean auth state
      // Uncomment if issues persist, but this is a last resort that affects UX
      // window.location.reload();
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Logout failed', error);
      // Even if logout fails, we still want the UI to show logged out state
      setIsAuthenticated(false);
      setUserInfo(null);
      clearTokens();
      sessionStorageService.clearSessionState();
      sessionStorageService.clearMsalCache();
    } finally {
      setIsProcessingAuth(false);
    }
  }, [
    instance, 
    isProcessingAuth, 
    setIsProcessingAuth, 
    setIsAuthenticated, 
    setUserInfo,
    clearTokens,
    clearExistingSession,
    endCurrentSession
  ]);

  // Handle password reset (uses a different policy)
  const handlePasswordReset = useCallback(async () => {
    if (isProcessingAuth) return;
    
    ComponentLogger.log(LOG_PREFIX, 'Password reset requested');
    setIsProcessingAuth(true);
    
    try {
      await instance.loginPopup(passwordResetRequest);
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Password reset failed', error);
      
      // Special case: if the user clicks "Cancel" on the password reset page,
      // we don't want to show an error, just return to the login page
      if (error instanceof Error && error.message.includes('AADB2C90091')) {
        // This is the cancel code, just log it
        ComponentLogger.log(LOG_PREFIX, 'User canceled password reset');
      } else {
        // Convert to standardized error
        const authError = authErrorHandler.handleMsalError(error);
        // Only set error if not user cancelled
        if (authError.code !== AuthErrorCode.USER_CANCELLED) {
          setError(authError.message);
        }
      }
    } finally {
      setIsProcessingAuth(false);
    }
  }, [instance, isProcessingAuth, setIsProcessingAuth, setError]);

  // Handle profile edit
  const handleEditProfile = useCallback(async () => {
    if (isProcessingAuth || !isAuthenticated) return;
    
    ComponentLogger.log(LOG_PREFIX, 'Profile edit requested');
    setIsProcessingAuth(true);
    
    try {
      await instance.loginPopup(profileEditRequest);
    } catch (error) {
      ComponentLogger.error(LOG_PREFIX, 'Profile edit failed', error);
      
      // Similar to password reset, handle cancel specially
      if (error instanceof Error && error.message.includes('AADB2C90091')) {
        ComponentLogger.log(LOG_PREFIX, 'User canceled profile edit');
      } else {
        // Convert to standardized error
        const authError = authErrorHandler.handleMsalError(error);
        // Only set error if not user cancelled
        if (authError.code !== AuthErrorCode.USER_CANCELLED) {
          setError(authError.message);
        }
      }
    } finally {
      setIsProcessingAuth(false);
    }
  }, [instance, isAuthenticated, isProcessingAuth, setIsProcessingAuth, setError]);

  return {
    handleSignIn,
    handleSignOut,
    handlePasswordReset,
    handleEditProfile,
    clearExistingSession
  };
}
