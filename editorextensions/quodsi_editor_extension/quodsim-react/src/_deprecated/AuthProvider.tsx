// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect } from "react";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { IPublicClientApplication } from "@azure/msal-browser";
import { useAuthentication } from "./useAuthentication";
import { ApiService } from "../services/apiService";
import { UserSyncResponse } from "../services/UserSyncService";
import { setMsalInstanceForHandlers } from "./msal-helpers";

// Define the authentication context shape
interface AuthContextType {
  isAuthenticated: boolean;
  userInfo: { name: string; email: string } | null;
  isProcessingAuth: boolean;
  error: string | null;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handlePasswordReset: () => Promise<void>;
  handleEditProfile: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  syncUserWithFastApi: () => Promise<UserSyncResponse | null>;
  forceUpdateAuthState: (
    isAuth: boolean,
    userInfo: { name: string; email: string } | null
  ) => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userInfo: null,
  isProcessingAuth: false,
  error: null,
  handleSignIn: async () => {},
  handleSignOut: async () => {},
  handlePasswordReset: async () => {},
  handleEditProfile: async () => {},
  getAccessToken: async () => null,
  syncUserWithFastApi: async () => null,
  forceUpdateAuthState: () => {},
});

// Inner provider that uses the MSAL hook
const InnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Use authentication hook to get auth state and functions
  const auth = useAuthentication();
  const { instance } = useMsal();

  // For debugging and state synchronization
  useEffect(() => {
    console.log("[AuthProvider] Current auth state:", {
      isAuthenticated: auth.isAuthenticated,
      hasUserInfo: !!auth.userInfo,
      msalAccountsCount: instance.getAllAccounts().length,
    });

    // This is a critical fix: ensure auth state is always in sync with MSAL
    // Sometimes MSAL internal state and our React state can get out of sync
    const accounts = instance.getAllAccounts();
    const hasAccounts = accounts.length > 0;

    // If we have a mismatch between auth state and MSAL accounts, force resync
    if (hasAccounts && !auth.isAuthenticated) {
      console.log(
        "[AuthProvider] Detected mismatch: MSAL has account but auth state is not authenticated. Fixing..."
      );
      // We have an account but aren't showing as authenticated - fix it
      const account = accounts[0];
      const userInfo = {
        name: account.name || account.username,
        email: account.username,
      };
      // Force update the auth state
      auth.forceUpdateAuthState(true, userInfo);
    } else if (!hasAccounts && auth.isAuthenticated) {
      console.log(
        "[AuthProvider] Detected mismatch: Auth state is authenticated but MSAL has no accounts. Fixing..."
      );
      // We're showing as authenticated but have no account - fix it
      auth.forceUpdateAuthState(false, null);
    }
  }, [
    auth.isAuthenticated,
    auth.userInfo,
    instance,
    auth.forceUpdateAuthState,
  ]);
  // Initialize API service with the token getter
  useEffect(() => {
    try {
      ApiService.getInstance(auth.getAccessToken);
    } catch (error) {
      console.error("[AuthProvider] Failed to initialize API service", error);
    }
  }, [auth.getAccessToken, instance]);

  useEffect(() => {
    // Make the MSAL instance available to message handlers
    setMsalInstanceForHandlers(instance);

    // Rest of your initialization code
    try {
      ApiService.getInstance(auth.getAccessToken);
    } catch (error) {
      console.error("[AuthProvider] Failed to initialize API service", error);
    }
  }, [auth.getAccessToken, instance]);
  // Provide the auth state and functions to all child components
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth.isAuthenticated,
        userInfo: auth.userInfo,
        isProcessingAuth: auth.isProcessingAuth,
        error: auth.error,
        handleSignIn: auth.handleSignIn,
        handleSignOut: auth.handleSignOut,
        handlePasswordReset: auth.handlePasswordReset,
        handleEditProfile: auth.handleEditProfile,
        getAccessToken: auth.getAccessToken,
        syncUserWithFastApi: auth.syncUserWithFastApi,
        forceUpdateAuthState: auth.forceUpdateAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Main provider that includes MSAL
interface AuthProviderProps {
  children: React.ReactNode;
  msalInstance: IPublicClientApplication;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  msalInstance,
}) => {
  return (
    <MsalProvider instance={msalInstance}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </MsalProvider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
