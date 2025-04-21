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
      
      console.log('[useAuthOperations] Cleared existing session data');
    } catch (error) {
      console.error('[useAuthOperations] Error clearing session data:', error);
    }
  }, [updateAuthState, clearTokens]);

  // Handle sign-in
  const handleSignIn = useCallback(async () => {
    if (isProcessingAuth) return;
    
    console.log('[useAuthOperations] Sign in requested');
    setIsProcessingAuth(true);
    setError(null);

    try {
      // Check if MSAL is initialized
      if (!isMsalInitialized) {
        console.log('[useAuthOperations] MSAL not initialized yet, waiting...');
        await new Promise(resolve => {
          // Wait for a maximum of 3 seconds for initialization
          const timeout = setTimeout(() => {
            console.log('[useAuthOperations] MSAL initialization timeout reached');
            resolve(null);
          }, 3000);
          
          // Check every 100ms if MSAL is ready
          const checkInterval = setInterval(() => {
            if (inProgress === 'none') {
              console.log('[useAuthOperations] MSAL is now initialized');
              clearTimeout(timeout);
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 100);
        });
      }

      // Notify extension that sign-in is starting
      authMessagingService.sendSignInStarted();

      // Clear any existing authentication session
      clearExistingSession();

      console.log('[useAuthOperations] Initiating loginPopup');
      // ALWAYS use standard MSAL popup flow
      const response = await instance.loginPopup(loginRequest);
      console.log('[useAuthOperations] Login successful', response);
      
      // Token will be acquired in the useEffect when accounts change
    } catch (error) {
      console.error('[useAuthOperations] Login failed', error);
      
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
    clearExistingSession
  ]);

  // Handle sign-out
  const handleSignOut = useCallback(async () => {
    if (isProcessingAuth) return;
    
    console.log('[useAuthOperations] Sign out requested');
    setIsProcessingAuth(true);

    try {
      // End session on backend
      await endCurrentSession();
      
      // Clear local state first
      setIsAuthenticated(false);
      setUserInfo(null);
      clearTokens();
      
      // Then notify extension about sign-out
      authMessagingService.sendSignOut();
      
      // Clear any cached sessions
      clearExistingSession();
      
      // Use popup for logout (more reliable in iframe environments)
      try {
        await instance.logoutPopup();
      } catch (e) {
        console.log('[useAuthOperations] Popup logout failed, clearing session locally');
        // If popup logout fails, we've already cleared the local state
      }
    } catch (error) {
      console.error('[useAuthOperations] Logout failed', error);
      // Even if logout fails, we still want the UI to show logged out state
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
    
    console.log('[useAuthOperations] Password reset requested');
    setIsProcessingAuth(true);
    
    try {
      await instance.loginPopup(passwordResetRequest);
    } catch (error) {
      console.error('[useAuthOperations] Password reset failed', error);
      
      // Special case: if the user clicks "Cancel" on the password reset page,
      // we don't want to show an error, just return to the login page
      if (error instanceof Error && error.message.includes('AADB2C90091')) {
        // This is the cancel code, just log it
        console.log('[useAuthOperations] User canceled password reset');
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
    
    console.log('[useAuthOperations] Profile edit requested');
    setIsProcessingAuth(true);
    
    try {
      await instance.loginPopup(profileEditRequest);
    } catch (error) {
      console.error('[useAuthOperations] Profile edit failed', error);
      
      // Similar to password reset, handle cancel specially
      if (error instanceof Error && error.message.includes('AADB2C90091')) {
        console.log('[useAuthOperations] User canceled profile edit');
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
