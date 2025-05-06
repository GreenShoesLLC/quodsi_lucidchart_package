// src/hooks/useAuthentication.ts
import { useCallback, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import {
  useAuthState,
  useTokenManager,
  useAuthOperations,
  useAuthSession,
  useBackendSync
} from "../hooks/auth";
import { authMessagingService } from "./AuthMessagingService";
import { sessionStorageService } from "src/_deprecated/SessionStorageService";

/**
 * Main authentication hook that combines specialized hooks
 * to provide the same public interface as before
 */
export function useAuthentication() {
  const { instance, accounts } = useMsal();

  // Use specialized hooks
  const {
    isAuthenticated,
    userInfo,
    error,
    isProcessingAuth,
    isMsalInitialized,
    setIsAuthenticated,
    setUserInfo
  } = useAuthState();

  const { getAccessToken } = useTokenManager();

  const {
    handleSignIn,
    handleSignOut,
    handlePasswordReset,
    handleEditProfile
  } = useAuthOperations();

  const { syncUserWithBackend } = useBackendSync();

  // Initialize message handlers
  useEffect(() => {
    // Register callback to handle auth state updates from messaging service
    authMessagingService.onAuthStateUpdate((isAuthenticated, userInfo) => {
      console.log("[useAuthentication] Updating global auth state from messaging:",
        { isAuthenticated, userInfo });

      // Update the state
      setIsAuthenticated(isAuthenticated);
      setUserInfo(userInfo);
    });

    // Handle authentication status requests
    authMessagingService.onAuthStatusRequest(() => {
      console.log("[useAuthentication] Handling auth status request");

      // Send current authentication status
      authMessagingService.sendAuthStatus(isAuthenticated, userInfo);
    });

    // Handle showing the auth panel
    authMessagingService.onShowAuthPanel((data) => {
      console.log("[useAuthentication] Auth panel shown:", data);
    });
  }, [isAuthenticated, userInfo, setIsAuthenticated, setUserInfo]);

  // Add a function to force update auth state for handling sync issues
  const forceUpdateAuthState = useCallback((isAuth: boolean, userInfoData: { name: string; email: string } | null) => {
    console.log("[useAuthentication] Force updating auth state:", { isAuth, hasUserInfo: !!userInfoData });

    // Update our internal state
    setIsAuthenticated(isAuth);
    setUserInfo(userInfoData);

    // Also update session storage to maintain consistency
    if (isAuth && userInfoData) {
      sessionStorageService.saveSessionState({
        isAuthenticated: isAuth,
        userInfo: userInfoData,
        accessToken: null, // Will be acquired as needed
        tokenExpiration: null,
        lastActive: Date.now()
      });
    } else {
      sessionStorageService.clearSessionState();
    }

    // Broadcast the updated state
    authMessagingService.sendAuthStatus(isAuth, userInfoData);
  }, [setIsAuthenticated, setUserInfo]);

  // Return the same interface as before with the new function added
  return {
    isAuthenticated,
    userInfo,
    handleSignIn,
    handleSignOut,
    handlePasswordReset,
    handleEditProfile,
    getAccessToken,
    syncUserWithFastApi: syncUserWithBackend, // Renamed for clarity but keeping same function
    isProcessingAuth,
    error,
    forceUpdateAuthState, // Add the new function
  };
}