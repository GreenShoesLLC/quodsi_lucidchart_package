// src/hooks/useManualAuthentication.ts
import { useCallback, useEffect, useState } from "react";
import { openExternalLoginWindow, processExternalLoginToken } from "./handleExternalLogin";
import { ExtensionMessaging, MessageTypes } from "@quodsi/shared";

/**
 * This hook provides a simplified, direct authentication flow as an alternative
 * to the MSAL-based authentication. It handles the authentication process
 * by directly opening a popup window to Azure B2C and processing the result.
 */
export function useManualAuthentication() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isProcessingAuth, setIsProcessingAuth] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const messaging = ExtensionMessaging.getInstance();

    // Clear any existing login session and cookies
    const clearSessionData = useCallback(() => {
        try {
            // Try to clear sessionStorage
            sessionStorage.clear();
            
            // Try to clear localStorage items related to auth
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
            
            console.log("[useManualAuthentication] Cleared session data");
        } catch (error) {
            console.error("[useManualAuthentication] Error clearing session data:", error);
        }
    }, []);

    // Handle sign-in
    const handleSignIn = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useManualAuthentication] Sign in requested");
        setIsProcessingAuth(true);
        setError(null);

        try {
            // Notify extension that sign-in is starting
            messaging.sendMessage(MessageTypes.AUTH_SIGN_IN);

            // Clear any existing session data
            clearSessionData();
            
            // Open the external login window
            const result = await openExternalLoginWindow();
            console.log("[useManualAuthentication] Login successful", result);
            
            if (result.accessToken) {
                setAccessToken(result.accessToken);
                
                // Process the token to get user info
                const userData = processExternalLoginToken(result.idToken || result.accessToken);
                
                // Update state
                const userInfo = {
                    name: userData.name || 'Unknown User',
                    email: userData.username || 'unknown@example.com'
                };
                
                setUserInfo(userInfo);
                setIsAuthenticated(true);
                
                // Notify extension about successful auth
                messaging.sendMessage(MessageTypes.AUTH_COMPLETED, {
                    success: true,
                    userInfo: userInfo,
                });
            } else {
                throw new Error("No access token received");
            }
        } catch (error) {
            console.error("[useManualAuthentication] Login failed", error);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(`Authentication failed: ${errorMessage}`);

            // Notify extension about auth error
            messaging.sendMessage(MessageTypes.AUTH_ERROR, {
                error: `Authentication failed: ${errorMessage}`,
            });
        } finally {
            setIsProcessingAuth(false);
        }
    }, [messaging, isProcessingAuth, clearSessionData]);

    // Handle sign-out
    const handleSignOut = useCallback(async () => {
        if (isProcessingAuth) return;
        
        console.log("[useManualAuthentication] Sign out requested");
        setIsProcessingAuth(true);

        try {
            // Clear local state first
            setIsAuthenticated(false);
            setUserInfo(null);
            setAccessToken(null);
            
            // Then notify extension about sign-out
            messaging.sendMessage(MessageTypes.AUTH_SIGN_OUT);
            
            // Clear session data
            clearSessionData();
            
        } catch (error) {
            console.error("[useManualAuthentication] Logout failed", error);
            // Even if logout fails, we still want the UI to show logged out state
        } finally {
            setIsProcessingAuth(false);
        }
    }, [messaging, isProcessingAuth, clearSessionData]);

    // Check for token expiration and refresh
    useEffect(() => {
        // If authenticated, set up a polling mechanism to check session
        if (isAuthenticated && accessToken) {
            const checkInterval = setInterval(() => {
                // Check localStorage for a token refresh
                try {
                    const storedResult = localStorage.getItem('quodsi_auth_result');
                    if (storedResult) {
                        const result = JSON.parse(storedResult);
                        if (result.hash) {
                            const params = new URLSearchParams(result.hash.substring(1));
                            const newToken = params.get('access_token');
                            if (newToken && newToken !== accessToken) {
                                console.log("[useManualAuthentication] Token refreshed");
                                setAccessToken(newToken);
                            }
                        }
                    }
                } catch (e) {
                    console.error("[useManualAuthentication] Error checking token:", e);
                }
            }, 30000); // Check every 30 seconds
            
            return () => clearInterval(checkInterval);
        }
    }, [isAuthenticated, accessToken]);

    // Placeholder implementations for required hook interface
    const handlePasswordReset = useCallback(async () => {
        // Not implemented in this simplified hook
        console.log("[useManualAuthentication] Password reset not implemented");
        setError("Password reset is not supported in this version");
    }, []);

    const handleEditProfile = useCallback(async () => {
        // Not implemented in this simplified hook
        console.log("[useManualAuthentication] Profile edit not implemented");
        setError("Profile editing is not supported in this version");
    }, []);

    const getAccessToken = useCallback(async (): Promise<string | null> => {
        // Simply return the current token
        return accessToken;
    }, [accessToken]);

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