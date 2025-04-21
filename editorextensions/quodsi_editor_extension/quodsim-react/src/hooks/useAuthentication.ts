// src/hooks/useAuthentication.ts
import { useCallback, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { 
    useAuthState, 
    useTokenManager, 
    useAuthOperations, 
    useAuthSession, 
    useBackendSync
} from "./auth";
import { authMessagingService } from "../services/AuthMessagingService";

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
        isMsalInitialized 
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
    }, [isAuthenticated, userInfo]);

    // Return the same interface as before to maintain compatibility
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
    };
}
