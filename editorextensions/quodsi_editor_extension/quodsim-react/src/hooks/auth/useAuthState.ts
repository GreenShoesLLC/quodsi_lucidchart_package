/**
 * useAuthState Hook
 * 
 * Manages core authentication state (isAuthenticated, userInfo, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { AccountInfo } from '@azure/msal-browser';
import { sessionStorageService, StoredUserInfo } from '../../services/SessionStorageService';
import { authMessagingService } from '../../services/AuthMessagingService';

// Define the user info type
export interface UserInfo {
  name: string;
  email: string;
}

// Define the AuthState type
export interface AuthState {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  error: string | null;
  isProcessingAuth: boolean;
  isMsalInitialized: boolean;
  setIsProcessingAuth: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  updateAuthState: (state: Partial<AuthStateUpdate>) => void;
}

// Interface for updating auth state
interface AuthStateUpdate {
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  error: string | null;
}

/**
 * useAuthState hook for managing core authentication state
 */
export function useAuthState(): AuthState {
  const { inProgress, accounts } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState<boolean>(false);
  const [isMsalInitialized, setIsMsalInitialized] = useState<boolean>(false);

  // Track MSAL initialization state
  useEffect(() => {
    if (inProgress === 'none') {
      setIsMsalInitialized(true);
      console.log('[useAuthState] MSAL initialization complete');
    } else {
      console.log('[useAuthState] MSAL initialization in progress:', inProgress);
    }
  }, [inProgress]);

  // Initialize state from stored session if available
  useEffect(() => {
    // Only attempt to load session state if MSAL is initialized
    if (isMsalInitialized) {
      try {
        const storedState = sessionStorageService.loadSessionState();
        
        if (storedState && storedState.isAuthenticated && storedState.userInfo) {
          console.log('[useAuthState] Loading auth state from session storage');
          setIsAuthenticated(storedState.isAuthenticated);
          setUserInfo(storedState.userInfo);
          setError(null);
        } else if (accounts.length === 0) {
          // Clear state if we don't have a valid session or accounts
          console.log('[useAuthState] No valid session or accounts found');
          setIsAuthenticated(false);
          setUserInfo(null);
        }
      } catch (loadError) {
        console.error('[useAuthState] Error loading session state:', loadError);
      }
    }
  }, [isMsalInitialized, accounts.length]);

  // Set up listener for auth status requests
  useEffect(() => {
    authMessagingService.onAuthStatusRequest(() => {
      // Send current authentication status
      authMessagingService.sendAuthStatus(isAuthenticated, userInfo);
    });
  }, [isAuthenticated, userInfo]);

  // Update multiple state properties at once
  const updateAuthState = useCallback((state: Partial<AuthStateUpdate>) => {
    if (state.isAuthenticated !== undefined) {
      setIsAuthenticated(state.isAuthenticated);
    }
    
    if (state.userInfo !== undefined) {
      setUserInfo(state.userInfo);
    }
    
    if (state.error !== undefined) {
      setError(state.error);
    }
  }, []);

  // Helper function to extract user info from MSAL account
  const extractUserInfoFromAccount = useCallback((account: AccountInfo): UserInfo => {
    return {
      name: account.name || account.username,
      email: account.username
    };
  }, []);

  // Add to useAuthState hook
  // Add this effect to periodically check auth status when not authenticated
  useEffect(() => {
    if (!isAuthenticated && isMsalInitialized) {
      // If not authenticated, but there's an account, try to fix the state
      if (accounts.length > 0) {
        console.log('[useAuthState] Found account but not authenticated, fixing state');
        const accountInfo = accounts[0];
        const userInfo = {
          name: accountInfo.name || accountInfo.username,
          email: accountInfo.username
        };

        // Update state
        setIsAuthenticated(true);
        setUserInfo(userInfo);

        // Save to session storage
        sessionStorageService.saveSessionState({
          isAuthenticated: true,
          userInfo,
          accessToken: null, // Will be acquired as needed
          tokenExpiration: null,
          lastActive: Date.now()
        });

        // Broadcast updated state
        authMessagingService.sendAuthStatus(true, userInfo);
      }
    }
  }, [isAuthenticated, isMsalInitialized, accounts]);


  // Update user info when accounts change (if authenticated)
  useEffect(() => {
    if (isAuthenticated && accounts.length > 0 && !userInfo) {
      const newUserInfo = extractUserInfoFromAccount(accounts[0]);
      setUserInfo(newUserInfo);
    } else if (accounts.length === 0 && isAuthenticated) {
      // If we have no accounts but are marked as authenticated, reset state
      setIsAuthenticated(false);
      setUserInfo(null);
    }
  }, [accounts, isAuthenticated, userInfo, extractUserInfoFromAccount]);

  return {
    isAuthenticated,
    userInfo,
    error,
    isProcessingAuth,
    isMsalInitialized,
    setIsAuthenticated,
    setUserInfo,
    setError,
    setIsProcessingAuth,
    updateAuthState
  };
}
