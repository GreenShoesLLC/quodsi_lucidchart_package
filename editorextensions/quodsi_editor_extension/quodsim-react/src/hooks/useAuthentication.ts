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
    profileEditRequest
} from "../auth/authConfig";
import { ExtensionMessaging, MessageTypes } from "@quodsi/shared";

interface TokenResponse {
    accessToken: string;
    idToken: string;
    expiresOn: Date | null; // Allow null for expiresOn
    account: AccountInfo;
    scopes: string[];
}

export function useAuthentication() {
    const { instance, accounts } = useMsal();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);
    const [isProcessingAuth, setIsProcessingAuth] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const messaging = ExtensionMessaging.getInstance();

    // Clear any existing login session data
    const clearExistingSession = useCallback(() => {
        try {
            // Try to clear sessionStorage
            sessionStorage.clear();
            
            // Try to clear localStorage items related to MSAL
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('msal') || key.includes('login') || key.includes('auth'))) {
                    localStorage.removeItem(key);
                }
            }
            
            // Try to clear related cookies
            document.cookie.split(';').forEach(cookie => {
                const [name] = cookie.trim().split('=');
                if (name && (name.includes('msal') || name.includes('login') || name.includes('auth'))) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });
            
            console.log("[useAuthentication] Cleared existing session data");
        } catch (error) {
            console.error("[useAuthentication] Error clearing session data:", error);
        }
    }, []);

    // Get active token silently
    const acquireTokenSilently = useCallback(async (): Promise<TokenResponse | null> => {
        if (accounts.length === 0) {
            return null;
        }
        
        try {
            const request: SilentRequest = {
                ...loginRequest,
                account: accounts[0]
            };
            
            const response = await instance.acquireTokenSilent(request);
            
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
            
            throw error;
        }
    }, [instance, accounts]);

    // Check if token is expiring soon (within 5 minutes)
    const isTokenExpiringSoon = useCallback((): boolean => {
        // If there's no token expiration, treat it as if it's expiring
        if (!tokenExpiration) {
            return true;
        }
        
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        return tokenExpiration.getTime() - now.getTime() < fiveMinutes;
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
                    return true;
                }
                return false;
            } catch (error) {
                console.error("[useAuthentication] Token refresh failed", error);
                return false;
            }
        }
        
        return true; // Token is valid, no need to refresh
    }, [isAuthenticated, tokenExpiration, isTokenExpiringSoon, acquireTokenSilently]);

    // Check if user is authenticated on mount and when accounts change
    useEffect(() => {
        const checkAuth = async () => {
            if (accounts.length > 0) {
                try {
                    const tokenResponse = await acquireTokenSilently();
                    
                    if (tokenResponse) {
                        setIsAuthenticated(true);
                        setAccessToken(tokenResponse.accessToken);
                        setTokenExpiration(tokenResponse.expiresOn);
                        
                        const accountInfo = {
                            name: accounts[0].name || accounts[0].username,
                            email: accounts[0].username,
                        };
                        
                        setUserInfo(accountInfo);
                        setError(null);

                        // Notify extension about successful auth
                        messaging.sendMessage(MessageTypes.AUTH_COMPLETED, {
                            success: true,
                            userInfo: accountInfo,
                        });
                        
                        console.log("[useAuthentication] Authentication successful", accountInfo);
                    } else {
                        // Could not get token silently
                        setIsAuthenticated(false);
                        setUserInfo(null);
                        setAccessToken(null);
                        setTokenExpiration(null);
                    }
                } catch (error) {
                    console.error("[useAuthentication] Token acquisition failed", error);
                    setIsAuthenticated(false);
                    setUserInfo(null);
                    setAccessToken(null);
                    setTokenExpiration(null);
                    setError("Failed to authenticate: " + (error instanceof Error ? error.message : String(error)));
                    
                    // Notify about error
                    messaging.sendMessage(MessageTypes.AUTH_ERROR, {
                        error: `Authentication error: ${error}`,
                    });
                }
            } else {
                setIsAuthenticated(false);
                setUserInfo(null);
                setAccessToken(null);
                setTokenExpiration(null);
            }
        };

        checkAuth();
    }, [accounts, messaging, acquireTokenSilently]);

    // Set up a token refresh timer
    useEffect(() => {
        // If authenticated and we have a token expiration
        if (isAuthenticated && tokenExpiration) {
            // Calculate time until we need to refresh (5 minutes before expiration)
            const now = new Date();
            const fiveMinutesBeforeExpiry = new Date(tokenExpiration.getTime() - 5 * 60 * 1000);
            const timeUntilRefresh = Math.max(0, fiveMinutesBeforeExpiry.getTime() - now.getTime());
            
            // Set up timer to refresh token
            const timerId = setTimeout(() => {
                console.log("[useAuthentication] Token refresh timer triggered");
                refreshTokenIfNeeded();
            }, timeUntilRefresh);
            
            // Clean up timer
            return () => clearTimeout(timerId);
        }
    }, [isAuthenticated, tokenExpiration, refreshTokenIfNeeded]);

    // Handle sign-in
    const handleSignIn = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useAuthentication] Sign in requested");
        setIsProcessingAuth(true);
        setError(null);

        try {
            // Notify extension that sign-in is starting
            messaging.sendMessage(MessageTypes.AUTH_SIGN_IN);

            // Clear any existing authentication session
            clearExistingSession();

            // ALWAYS use standard MSAL popup flow
            const response = await instance.loginPopup(loginRequest);
            console.log("[useAuthentication] Login successful", response);
            
            // Token will be acquired in the useEffect when accounts change
        } catch (error) {
            console.error("[useAuthentication] Login failed", error);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(`Authentication failed: ${errorMessage}`);

            // Notify extension about auth error
            messaging.sendMessage(MessageTypes.AUTH_ERROR, {
                error: `Authentication failed: ${errorMessage}`,
            });
        } finally {
            setIsProcessingAuth(false);
        }
    }, [instance, messaging, isProcessingAuth, clearExistingSession]);

    // Handle sign-out
    const handleSignOut = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useAuthentication] Sign out requested");
        setIsProcessingAuth(true);

        try {
            // Clear local state first
            setIsAuthenticated(false);
            setUserInfo(null);
            setAccessToken(null);
            setTokenExpiration(null);
            
            // Then notify extension about sign-out
            messaging.sendMessage(MessageTypes.AUTH_SIGN_OUT);
            
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
    }, [instance, messaging, isProcessingAuth, clearExistingSession]);

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
                setError(`Password reset failed: ${error instanceof Error ? error.message : String(error)}`);
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
                setError(`Profile edit failed: ${error instanceof Error ? error.message : String(error)}`);
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
        
        return accessToken;
    }, [isAuthenticated, accessToken, tokenExpiration, isTokenExpiringSoon, refreshTokenIfNeeded]);

    return {
        isAuthenticated,
        userInfo,
        handleSignIn,
        handleSignOut,
        handlePasswordReset,
        handleEditProfile,
        getAccessToken,
        isProcessingAuth,
        error,
    };
}