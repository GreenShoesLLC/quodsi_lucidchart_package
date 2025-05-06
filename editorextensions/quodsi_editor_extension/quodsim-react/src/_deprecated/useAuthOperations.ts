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
} from '../auth/config';
import { useAuthState } from './useAuthState';
import { useTokenManager } from './useTokenManager';
import { sessionStorageService } from './SessionStorageService';
import { authMessagingService } from './AuthMessagingService';
import { authErrorHandler, AuthErrorCode } from './AuthErrorHandler';
import { useAuthSession } from './useAuthSession';
import { ComponentLogger } from '@quodsi/shared';

// Define a constant for the logger prefix
const LOG_PREFIX = '[useAuthOperations]';

// Initialize logging to be disabled by default
ComponentLogger.setEnabled(LOG_PREFIX, true);

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

    // Add extra tracking for this specific scenario - consecutive sign-ins
    const hasJustSignedOut = window.sessionStorage.getItem('quodsi_just_signed_out') === 'true';
    if (hasJustSignedOut) {
      ComponentLogger.log(LOG_PREFIX, 'Detected sign-in attempt after recent sign-out, taking extra precautions');
    }

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

      // Check if this is a sign-in attempt after a recent sign-out
      const hasJustSignedOut = window.sessionStorage.getItem('quodsi_just_signed_out') === 'true';
      const signOutTime = parseInt(window.sessionStorage.getItem('quodsi_signout_time') || '0', 10);
      const timeSinceSignOut = Date.now() - signOutTime;
      const isRecentSignOut = timeSinceSignOut < 60000; // within 1 minute

      ComponentLogger.log(LOG_PREFIX, `Pre-sign-in state:`, {
        hasJustSignedOut,
        timeSinceSignOut: `${timeSinceSignOut}ms`
      });

      // If this is a sign-in after a recent sign-out, we need special handling
      if (hasJustSignedOut && isRecentSignOut) {
        // This is our special case that was failing before
        ComponentLogger.log(LOG_PREFIX, `SPECIAL CASE DETECTED: Sign-in attempt immediately after sign-out`);

        // For the special case, force a reload of the page first
        // This is a more extreme solution, but will ensure we start with a clean state
        if (window.location.href.indexOf('?quodsi_reset=true') === -1) {
          // We haven't yet done a reset, so add a flag and reload
          ComponentLogger.log(LOG_PREFIX, `Forcing page reload to completely reset MSAL state...`);

          // Add a flag to the URL so we know we've already tried a reload
          window.sessionStorage.removeItem('quodsi_just_signed_out');
          window.sessionStorage.removeItem('quodsi_signout_time');

          // Note: This will interrupt the current sign-in flow, but it's necessary
          // to completely reset the MSAL state for the problematic case
          window.location.href = window.location.href +
            (window.location.href.indexOf('?') > -1 ? '&' : '?') +
            'quodsi_reset=true';

          // Return early since we're reloading the page
          return;
        } else {
          // We've already done a reload, but still mark that we're handling the special case
          ComponentLogger.log(LOG_PREFIX, `Page already reset, continuing with special handling`);

          // Remove the reset flag from the URL
          const url = new URL(window.location.href);
          url.searchParams.delete('quodsi_reset');
          window.history.replaceState({}, document.title, url.toString());
        }
      }

      // Force a complete reset before attempting sign-in
      await new Promise<void>(resolve => {
        // First, forcefully clear the auth state
        updateAuthState({
          isAuthenticated: false,
          userInfo: null,
          error: null
        });

        // Clear all tokens
        clearTokens();

        // Clear all storage
        sessionStorageService.clearSessionState();
        sessionStorageService.clearMsalCache();

        // Special handling for the problem case
        if (hasJustSignedOut && isRecentSignOut) {
          // Double clear everything with a longer timeout
          setTimeout(() => {
            // Try again to clear the cache
            sessionStorageService.clearMsalCache();
            sessionStorageService.clearSessionState();

            // Try to find and remove any MSAL accounts
            const accounts = instance.getAllAccounts();
            if (accounts.length > 0) {
              ComponentLogger.log(LOG_PREFIX, `Extra clearing for ${accounts.length} MSAL accounts`);
            }

            // Clear the sign-out flags
            window.sessionStorage.removeItem('quodsi_just_signed_out');
            window.sessionStorage.removeItem('quodsi_signout_time');

            // Continue
            resolve();
          }, 500);
        } else {
          // Normal case: Give a short delay to ensure all state is cleared before proceeding
          setTimeout(() => {
            // Check for any existing MSAL accounts
            const existingAccounts = instance.getAllAccounts();
            if (existingAccounts.length > 0) {
              ComponentLogger.log(LOG_PREFIX, `Found ${existingAccounts.length} existing accounts, forcing additional cache clear`);

              // If accounts still exist, try more aggressive clearing
              sessionStorageService.clearMsalCache();

              // Verify accounts were cleared
              const remainingAccounts = instance.getAllAccounts();
              if (remainingAccounts.length > 0) {
                ComponentLogger.log(LOG_PREFIX, `${remainingAccounts.length} accounts still remain after aggressive clearing, will continue anyway`);
              } else {
                ComponentLogger.log(LOG_PREFIX, 'Successfully cleared all MSAL accounts');
              }
            }

            // Continue with the sign-in process
            resolve();
          }, 300);
        }
      });

      // Final verification that state is clean before proceeding
      const currentAccounts = instance.getAllAccounts();
      ComponentLogger.log(LOG_PREFIX, 'Pre-login state verification:', {
        isAuthenticated,
        // hasUserInfoInState: !!userInfo,
        msalAccountsCount: currentAccounts.length,
        isPostSignOut: hasJustSignedOut && isRecentSignOut,
        timeSinceSignOut: hasJustSignedOut ? `${timeSinceSignOut}ms` : 'N/A',
      });

      // Prepare login options with prompt=login to force fresh authentication
      const loginOptions = {
        ...loginRequest,
        prompt: 'login' // Force login prompt to avoid any cached sessions
      };

      // Log the complete login options to diagnose authority issues
      ComponentLogger.log(LOG_PREFIX, 'Login options:', {
        scopes: loginOptions.scopes,
        authority: loginOptions.authority,
        prompt: loginOptions.prompt,
        hasLoginHint: !!loginOptions.loginHint
      });

      if (!loginOptions.authority) {
        ComponentLogger.warn(LOG_PREFIX, 'No authority specified in login options! This will likely cause authentication problems.');
        // Fix by importing directly from auth policies
        const { buildAuthority, b2cPolicies } = await import('./authPolicies');
        loginOptions.authority = buildAuthority(b2cPolicies.signUpSignIn);
        ComponentLogger.log(LOG_PREFIX, 'Added missing authority:', loginOptions.authority);
      }

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
        // This is the "No active account found after login" case - try to recover
        ComponentLogger.warn(LOG_PREFIX, 'No account in response! Checking for accounts in MSAL...');

        // Check if there are any accounts in MSAL that we can use
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          // Use the first account we find
          const account = accounts[0];
          ComponentLogger.log(LOG_PREFIX, `Found account in MSAL: ${account.username}`);

          const userInfo = {
            name: account.name || account.username,
            email: account.username
          };

          // Update local state
          updateAuthState({
            isAuthenticated: true,
            userInfo,
            error: null
          });

          // Save to session storage
          sessionStorageService.saveSessionState({
            isAuthenticated: true,
            userInfo,
            accessToken: null, // We don't have a token, it will be acquired on demand
            tokenExpiration: null,
            lastActive: Date.now()
          });

          // Notify extension about successful auth
          authMessagingService.sendAuthCompleted(true, userInfo);
          return; // We've recovered, return successfully
        }

        // If we get here, we couldn't recover
        ComponentLogger.error(LOG_PREFIX, 'Login response missing account information and no accounts found in MSAL');
        throw new Error('No active account found after login');
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

    // Set a flag in sessionStorage to track the sign-out
    // This helps us detect consecutive sign-in attempts after sign-out
    try {
      window.sessionStorage.setItem('quodsi_just_signed_out', 'true');
      window.sessionStorage.setItem('quodsi_signout_time', Date.now().toString());
    } catch (e) {
      ComponentLogger.error(LOG_PREFIX, 'Failed to set sign-out tracking flags', e);
    }

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

      // Import the getRedirectUri function to get the properly configured URI
      const { getRedirectUri } = await import('./msalConfig');

      // More reliable sign-out process with better state management
      try {
        // Get the proper redirect URI from the config
        const redirectUri = getRedirectUri();
        ComponentLogger.log(LOG_PREFIX, `Using post-logout redirect URI: ${redirectUri}`);

        // First, ensure our local state is cleared
        setIsAuthenticated(false);
        setUserInfo(null);
        clearTokens();

        // Clear session storage and MSAL cache
        sessionStorageService.clearSessionState();
        sessionStorageService.clearMsalCache();

        // Perform the actual MSAL logout
        try {
          // Force prompt on next login
          await instance.logoutPopup({
            postLogoutRedirectUri: redirectUri,
            mainWindowRedirectUri: redirectUri,
          });

          ComponentLogger.log(LOG_PREFIX, 'MSAL logout popup completed successfully');
        } catch (logoutError) {
          // If popup fails, try to log out manually
          ComponentLogger.error(LOG_PREFIX, 'Popup logout failed, using fallback', logoutError);
        }

        // Regardless of logout success, clear all accounts that might remain
        const remainingAccounts = instance.getAllAccounts();
        if (remainingAccounts.length > 0) {
          ComponentLogger.log(LOG_PREFIX, `${remainingAccounts.length} accounts still remain, forcing additional clearing`);

          // More aggressive MSAL cache clearing
          sessionStorageService.clearMsalCache();
          sessionStorageService.clearSessionState();
        }

        // Verify once more
        const finalAccounts = instance.getAllAccounts();
        if (finalAccounts.length > 0) {
          ComponentLogger.warn(LOG_PREFIX, `${finalAccounts.length} accounts still remain after all clearing attempts`);
        } else {
          ComponentLogger.log(LOG_PREFIX, 'Successfully cleared all MSAL accounts');
        }

        // Don't immediately reload - let MSAL handle the redirect
        // Only reload if we don't see a redirect happening within 1 second
        const reloadTimeout = setTimeout(() => {
          ComponentLogger.log(LOG_PREFIX, 'No redirect detected after logout, refreshing page state');
          // Instead of a full page reload, re-initialize our auth state
          setIsAuthenticated(false);
          setUserInfo(null);
          clearTokens();
          sessionStorageService.clearSessionState();
          sessionStorageService.clearMsalCache();

          // Only force reload as a last resort if still needed
          if (instance.getAllAccounts().length > 0) {
            ComponentLogger.log(LOG_PREFIX, 'Accounts still present after all clearing, forcing reload');
            window.location.reload();
          }
        }, 800);

        // Clear the timeout if we navigate away
        window.addEventListener('unload', () => clearTimeout(reloadTimeout), { once: true });
      } catch (e) {
        ComponentLogger.error(LOG_PREFIX, 'Complete logout process failed', e);
        // Even if the whole process fails, ensure our state is reset
        setIsAuthenticated(false);
        setUserInfo(null);
        clearTokens();
        sessionStorageService.clearSessionState();
        sessionStorageService.clearMsalCache();
      }

      // Final safety check - ensure all storage is cleared
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
