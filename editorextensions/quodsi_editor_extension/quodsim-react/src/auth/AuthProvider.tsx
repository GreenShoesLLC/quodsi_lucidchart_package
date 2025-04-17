// src/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { useAuthentication } from '../hooks/useAuthentication';
import { ApiService } from '../services/apiService';

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
});

// Inner provider that uses the MSAL hook
const InnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always use MSAL authentication, even in iframe environments
  const auth = useAuthentication();
  const { instance } = useMsal();
  
  // For debugging
  useEffect(() => {
    console.log('[AuthProvider] Using MSAL authentication');
  }, []);
  
  // Initialize API service with the token getter
  useEffect(() => {
    try {
      ApiService.getInstance(auth.getAccessToken);
    } catch (error) {
      console.error('Failed to initialize API service', error);
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, msalInstance }) => {
  return (
    <MsalProvider instance={msalInstance}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </MsalProvider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);