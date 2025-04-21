// src/hooks/useAuthentication.ts
import { useCallback, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { 
    AccountInfo, 
    InteractionRequiredAuthError, 
    SilentRequest
} from "@azure/msal-browser";
import { 
    loginRequest, 
    passwordResetRequest, 
    profileEditRequest,
    TOKEN_REFRESH_BUFFER_MS
} from "../auth/config";

// Import specialized services
import { sessionStorageService } from "../services/SessionStorageService";
import { userSyncService, UserSyncResponse } from "../services/UserSyncService";
import { authMessagingService } from "../services/AuthMessagingService";
import { authErrorHandler, AuthErrorCode } from "../services/AuthErrorHandler";

interface TokenResponse {
    accessToken: string;
    idToken: string;
    expiresOn: Date | null; // Allow null for expiresOn
    account: AccountInfo;
    scopes: string[];
}

export function useAuthentication() {
    const { instance, accounts, inProgress } = useMsal();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);
    const [isProcessingAuth, setIsProcessingAuth] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMsalInitialized, setIsMsalInitialized] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    // Track MSAL initialization state
    useEffect(() => {
        if (inProgress === 'none') {
            setIsMsalInitialized(true);
            console.log("[useAuthentication] MSAL initialization complete");
        } else {
            console.log("[useAuthentication] MSAL initialization in progress:", inProgress);
        }
    }, [inProgress]);

    // Clear any existing login session data
    const clearExistingSession = useCallback(() => {
        try {
            // Use SessionStorageService to clear storage
            sessionStorageService.clearSessionState();
            sessionStorageService.clearMsalCache();
            
            // Clear session ID
            setSessionId(null);
            
            console.log("[useAuthentication] Cleared existing session data");
        } catch (error) {
            console.error("[useAuthentication] Error clearing session data:", error);
        }
    }, []);

    // Get active token silently
    const acquireTokenSilently = useCallback(async (): Promise<TokenResponse | null> => {
        // Ensure MSAL is initialized before attempting to acquire token
        if (!isMsalInitialized) {
            console.log("[useAuthentication] MSAL not yet initialized, cannot acquire token");
            return null;
        }
    
        if (accounts.length === 0) {
            return null;
        }
        
        try {
            const request: SilentRequest = {
                ...loginRequest,
                account: accounts[0]
            };
            
            console.log("[useAuthentication] Acquiring token silently");
            const response = await instance.acquireTokenSilent(request);
            console.log("[useAuthentication] Token acquired successfully");
            
            return {
                accessToken: response.accessToken,
                idToken: response.idToken,
                expiresOn: response.expiresOn, // This can be null in some cases
                account: response.account,
                scopes: response.scopes
            };
        } catch (error) {
            console.error("[useAuthentication] Silent token acquisition failed", error);
            
            // Handle the case where silent authentication fails
            if (error instanceof InteractionRequiredAuthError) {
                // User needs to re-authenticate, don't automatically start popup
                return null;
            }
            
            // Convert to standardized error
            const authError = authErrorHandler.handleMsalError(error);
            throw authError;
        }
    }, [instance, accounts, isMsalInitialized]);

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
                    setAccessToken(tokenResponse.accessToken);
                    setTokenExpiration(tokenResponse.expiresOn);
                    
                    // Update session storage
                    if (userInfo) {
                        sessionStorageService.saveSessionState({
                            isAuthenticated: true,
                            userInfo,
                            accessToken: tokenResponse.accessToken,
                            tokenExpiration: tokenResponse.expiresOn,
                            lastActive: Date.now()
                        });
                    }
                    
                    return true;
                }
                return false;
            } catch (error) {
                console.error("[useAuthentication] Token refresh failed", error);
                return false;
            }
        }
        
        return true; // Token is valid, no need to refresh
    }, [isAuthenticated, tokenExpiration, isTokenExpiringSoon, acquireTokenSilently, userInfo]);

    // Check if user is authenticated on mount and when accounts change
    useEffect(() => {
        const checkAuth = async () => {
            // Only proceed if MSAL is initialized
            if (!isMsalInitialized) {
                console.log("[useAuthentication] Waiting for MSAL to initialize before checking auth");
                return; // Exit early and wait for next update when initialized
            }
            
            console.log("[useAuthentication] Checking authentication status with accounts:", accounts.length);
            
            if (accounts.length > 0) {
                try {
                    console.log("[useAuthentication] Account found, attempting to acquire token");
                    const tokenResponse = await acquireTokenSilently();
                    
                    if (tokenResponse) {
                        console.log("[useAuthentication] Token response received, updating state");
                        setIsAuthenticated(true);
                        setAccessToken(tokenResponse.accessToken);
                        setTokenExpiration(tokenResponse.expiresOn);
                        
                        const accountInfo = {
                            name: accounts[0].name || accounts[0].username,
                            email: accounts[0].username,
                        };
                        
                        setUserInfo(accountInfo);
                        setError(null);

                        // Save to session storage
                        sessionStorageService.saveSessionState({
                            isAuthenticated: true,
                            userInfo: accountInfo,
                            accessToken: tokenResponse.accessToken,
                            tokenExpiration: tokenResponse.expiresOn,
                            lastActive: Date.now()
                        });

                        // Attempt to sync user with quodsi-fastapi
                        try {
                            console.log("[useAuthentication] Syncing user with quodsi-fastapi");
                            const userSyncResponse = await userSyncService.syncUser(tokenResponse.accessToken);
                            
                            if (userSyncResponse) {
                                console.log("[useAuthentication] User synced successfully", userSyncResponse);
                                
                                // Create a session if we don't have one
                                if (!sessionId) {
                                    try {
                                        const sessionResponse = await userSyncService.createSession(tokenResponse.accessToken);
                                        if (sessionResponse) {
                                            setSessionId(sessionResponse.session_id);
                                            console.log("[useAuthentication] Created session:", sessionResponse.session_id);
                                        }
                                    } catch (sessionError) {
                                        console.error("[useAuthentication] Failed to create session", sessionError);
                                    }
                                }
                            } else {
                                console.warn("[useAuthentication] User sync returned null response");
                            }
                        } catch (syncError) {
                            // Log error but continue with authentication
                            console.error("[useAuthentication] Error syncing user with quodsi-fastapi", syncError);
                        }

                        // Notify extension about successful auth using the messaging service
                        authMessagingService.sendAuthCompleted(true, accountInfo);
                        
                        console.log("[useAuthentication] Authentication successful", accountInfo);
                    } else {
                        // Could not get token silently
                        console.log("[useAuthentication] Could not get token silently, resetting state");
                        setIsAuthenticated(false);
                        setUserInfo(null);
                        setAccessToken(null);
                        setTokenExpiration(null);
                        sessionStorageService.clearSessionState();
                    }
                } catch (error) {
                    console.error("[useAuthentication] Token acquisition failed", error);
                    setIsAuthenticated(false);
                    setUserInfo(null);
                    setAccessToken(null);
                    setTokenExpiration(null);
                    
                    // Convert to standardized error
                    const authError = authErrorHandler.handleMsalError(error);
                    setError(authError.message);
                    
                    // Clear session storage
                    sessionStorageService.clearSessionState();
                    
                    // Notify about error
                    authMessagingService.sendAuthError(authError);
                }
            } else {
                console.log("[useAuthentication] No accounts found, setting unauthenticated state");
                setIsAuthenticated(false);
                setUserInfo(null);
                setAccessToken(null);
                setTokenExpiration(null);
                sessionStorageService.clearSessionState();
            }
        };

        checkAuth();
    }, [accounts, acquireTokenSilently, isMsalInitialized, sessionId]);

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
                console.log("[useAuthentication] Token refresh timer triggered");
                refreshTokenIfNeeded();
            }, timeUntilRefresh);
            
            // Clean up timer
            return () => clearTimeout(timerId);
        }
    }, [isAuthenticated, tokenExpiration, refreshTokenIfNeeded]);

    // Set up session activity timer
    useEffect(() => {
        // If we have an active session, update activity periodically
        if (isAuthenticated && sessionId && accessToken) {
            // Update activity every 5 minutes
            const activityInterval = setInterval(() => {
                console.log("[useAuthentication] Updating session activity");
                
                // Update last active timestamp
                sessionStorageService.updateLastActive();
                
                // Update session activity on backend
                userSyncService.updateSession(accessToken, sessionId)
                    .catch(error => console.error("[useAuthentication] Failed to update session activity", error));
            }, 5 * 60 * 1000); // 5 minutes
            
            return () => clearInterval(activityInterval);
        }
    }, [isAuthenticated, sessionId, accessToken]);

    // Handle sign-in
    const handleSignIn = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useAuthentication] Sign in requested");
        setIsProcessingAuth(true);
        setError(null);

        try {
            // Check if MSAL is initialized
            if (!isMsalInitialized) {
                console.log("[useAuthentication] MSAL not initialized yet, waiting...");
                await new Promise(resolve => {
                    // Wait for a maximum of 3 seconds for initialization
                    const timeout = setTimeout(() => {
                        console.log("[useAuthentication] MSAL initialization timeout reached");
                        resolve(null);
                    }, 3000);
                    
                    // Check every 100ms if MSAL is ready
                    const checkInterval = setInterval(() => {
                        if (inProgress === 'none') {
                            console.log("[useAuthentication] MSAL is now initialized");
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

            console.log("[useAuthentication] Initiating loginPopup");
            // ALWAYS use standard MSAL popup flow
            const response = await instance.loginPopup(loginRequest);
            console.log("[useAuthentication] Login successful", response);
            
            // Token will be acquired in the useEffect when accounts change
        } catch (error) {
            console.error("[useAuthentication] Login failed", error);
            
            // Convert to standardized error
            const authError = authErrorHandler.handleMsalError(error);
            setError(authError.message);

            // Notify extension about auth error
            authMessagingService.sendAuthError(authError);
        } finally {
            setIsProcessingAuth(false);
        }
    }, [instance, isProcessingAuth, clearExistingSession, isMsalInitialized, inProgress]);

    // Handle sign-out
    const handleSignOut = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useAuthentication] Sign out requested");
        setIsProcessingAuth(true);

        try {
            // End session on backend if we have a session ID
            if (sessionId && accessToken) {
                try {
                    await userSyncService.endSession(accessToken, sessionId);
                    console.log("[useAuthentication] Ended backend session");
                } catch (sessionError) {
                    console.error("[useAuthentication] Failed to end backend session", sessionError);
                }
            }
            
            // Clear local state first
            setIsAuthenticated(false);
            setUserInfo(null);
            setAccessToken(null);
            setTokenExpiration(null);
            setSessionId(null);
            
            // Then notify extension about sign-out
            authMessagingService.sendSignOut();
            
            // Clear any cached sessions
            clearExistingSession();
            
            // Use popup for logout (more reliable in iframe environments)
            try {
                await instance.logoutPopup();
            } catch (e) {
                console.log("[useAuthentication] Popup logout failed, clearing session locally");
                // If popup logout fails, we've already cleared the local state
            }
        } catch (error) {
            console.error("[useAuthentication] Logout failed", error);
            // Even if logout fails, we still want the UI to show logged out state
        } finally {
            setIsProcessingAuth(false);
        }
    }, [instance, isProcessingAuth, clearExistingSession, sessionId, accessToken]);

    // Handle password reset (uses a different policy)
    const handlePasswordReset = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useAuthentication] Password reset requested");
        setIsProcessingAuth(true);
        
        try {
            await instance.loginPopup(passwordResetRequest);
        } catch (error) {
            console.error("[useAuthentication] Password reset failed", error);
            
            // Special case: if the user clicks "Cancel" on the password reset page,
            // we don't want to show an error, just return to the login page
            if (error instanceof Error && error.message.includes("AADB2C90091")) {
                // This is the cancel code, just log it
                console.log("[useAuthentication] User canceled password reset");
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
    }, [instance, isProcessingAuth]);

    // Handle profile edit
    const handleEditProfile = useCallback(async () => {
        if (isProcessingAuth || !isAuthenticated) return;
        
        console.log("[useAuthentication] Profile edit requested");
        setIsProcessingAuth(true);
        
        try {
            await instance.loginPopup(profileEditRequest);
        } catch (error) {
            console.error("[useAuthentication] Profile edit failed", error);
            
            // Similar to password reset, handle cancel specially
            if (error instanceof Error && error.message.includes("AADB2C90091")) {
                console.log("[useAuthentication] User canceled profile edit");
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
    }, [instance, isAuthenticated, isProcessingAuth]);

    // Function to get a fresh token for API calls
    const getAccessToken = useCallback(async (): Promise<string | null> => {
        if (!isAuthenticated) {
            console.warn("[useAuthentication] Cannot get token - not authenticated");
            return null;
        }
        
        // Check if we need to refresh the token
        if (!tokenExpiration || isTokenExpiringSoon()) {
            const refreshed = await refreshTokenIfNeeded();
            if (!refreshed) {
                console.warn("[useAuthentication] Token refresh failed");
                return null;
            }
        }
        
        // Update session activity timestamp
        sessionStorageService.updateLastActive();
        
        return accessToken;
    }, [isAuthenticated, accessToken, tokenExpiration, isTokenExpiringSoon, refreshTokenIfNeeded]);

    // Function to sync user with quodsi-fastapi
    const syncUserWithFastApi = useCallback(async (): Promise<UserSyncResponse | null> => {
        if (!isAuthenticated) {
            console.warn("[useAuthentication] Cannot sync user - not authenticated");
            return null;
        }
        
        // Get token
        const token = await getAccessToken();
        if (!token) {
            console.warn("[useAuthentication] Cannot sync user - no token available");
            return null;
        }
        
        try {
            return await userSyncService.syncUser(token);
        } catch (error) {
            console.error("[useAuthentication] Error in syncUserWithFastApi", error);
            return null;
        }
    }, [isAuthenticated, getAccessToken]);

    // Initialize message handlers
    useEffect(() => {
        // Handle authentication status requests
        authMessagingService.onAuthStatusRequest(() => {
            console.log("[useAuthentication] Handling auth status request");
            
            if (isAuthenticated && userInfo) {
                // Update last active timestamp
                sessionStorageService.updateLastActive();
            }
            
            // Send current authentication status
            authMessagingService.sendAuthStatus(isAuthenticated, userInfo);
        });
        
        // Handle showing the auth panel
        authMessagingService.onShowAuthPanel((data) => {
            console.log("[useAuthentication] Auth panel shown:", data);
            
            // Update last active timestamp if authenticated
            if (isAuthenticated && userInfo) {
                sessionStorageService.updateLastActive();
            }
        });
    }, [isAuthenticated, userInfo]);

    return {
        isAuthenticated,
        userInfo,
        handleSignIn,
        handleSignOut,
        handlePasswordReset,
        handleEditProfile,
        getAccessToken,
        syncUserWithFastApi,
        isProcessingAuth,
        error,
    };
}