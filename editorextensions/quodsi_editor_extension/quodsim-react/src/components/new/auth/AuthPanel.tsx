import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuthState } from '../../../messaging/hooks/useAuthState';
import { QuodsiUserInfo } from '@quodsi/shared';
import { loginRequest, b2cPolicies } from '../../../auth/msalConfig';

/**
 * Error component for displaying authentication errors
 */
const AuthError: React.FC<{
  error: { message: string; code?: string };
  onDismiss: () => void;
  onRetry: () => void;
  onPasswordReset?: () => void;
}> = ({ error, onDismiss, onRetry, onPasswordReset }) => {
  return (
    <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
      <div className="flex justify-between">
        <p className="font-bold">Authentication Error</p>
        <button onClick={onDismiss} className="text-red-700">
          &times;
        </button>
      </div>
      <p className="text-sm">{error.message}</p>
      <div className="mt-2 flex space-x-2">
        <button
          onClick={onRetry}
          className="text-xs bg-red-200 px-2 py-1 rounded hover:bg-red-300"
        >
          Try Again
        </button>
        {onPasswordReset && (
          <button
            onClick={onPasswordReset}
            className="text-xs bg-red-200 px-2 py-1 rounded hover:bg-red-300"
          >
            Reset Password
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Debug panel for development
 */
const DebugPanel: React.FC = () => {
  const { isAuthenticated, userInfo } = useAuthState();

  return (
    <div className="mb-4 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
      <h3 className="font-bold mb-1">Auth Debug</h3>
      <div>
        <p>IsAuthenticated: {isAuthenticated ? 'true' : 'false'}</p>
        {userInfo && (
          <div>
            <p>User: {userInfo.displayName || userInfo.email}</p>
            <p>Email: {userInfo.email}</p>
            <p>ID: {userInfo.id}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * AuthPanel component using the new messaging system
 */
export const AuthPanel: React.FC = () => {
  const { instance, accounts } = useMsal();
  const { 
    isAuthenticated, 
    userInfo, 
    isLoading, 
    error,
    login,
    logout
  } = useAuthState();
  
  const [showError, setShowError] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(true); // Set to true by default for debugging
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  
  // Reset error visibility when the error changes
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  // Log authentication state for debugging
  useEffect(() => {
    console.log('### DIRECT DEBUG ### AuthPanel state:', { 
      isAuthenticated, 
      userInfo, 
      isLoading, 
      error 
    });
  }, [isAuthenticated, userInfo, isLoading, error]);

  // Handle sign in process
  const handleSignIn = async () => {
    console.log('### DIRECT DEBUG ### handleSignIn called');
    
    if (isProcessingAuth) return;
    
    setIsProcessingAuth(true);
    try {
      // For development mode - check if we're in a development environment
      const isDevelopment = process.env.NODE_ENV === 'development' && !window.location.href.includes('localhost:9900');
      
      if (isDevelopment) {
        console.log('### DIRECT DEBUG ### Using development mode authentication');
        // Simulate login success with mock data
        const mockUser: QuodsiUserInfo = {
          id: 'dev-user-123',
          email: 'dev@example.com',
          displayName: 'Development User'
        };
        
        // Create a mock token
        const mockToken = 'dev-token-' + Date.now();
        
        // Send login success message
        console.log('### DIRECT DEBUG ### Sending mock login success message');
        login(mockToken, mockUser, false);
      } else {
        // Production mode - Use real MSAL authentication
        console.log('### DIRECT DEBUG ### Using production mode authentication with MSAL');
        // Login with popup using MSAL
        const result = await instance.loginPopup(loginRequest);
        console.log('### DIRECT DEBUG ### MSAL login successful, result:', result ? 'Success' : 'No result');
        
        if (result) {
          // Extract user information from the account
        const account =
          instance.getActiveAccount() || (accounts.length > 0 ? accounts[0] : null);
          console.log('### DIRECT DEBUG ### Active account:', account);
          
          if (account) {
            const newUser = accounts.length === 1; // Assume first login means new user
            
            // Create user info from account
            const user: QuodsiUserInfo = {
              id: account.localAccountId,
              email: account.username,
              displayName: account.name
            };
            
            // Send login success message
            console.log('### DIRECT DEBUG ### Sending login success message with user:', user);
            login(result.idToken, user, newUser);
          } else {
            console.log('### DIRECT DEBUG ### No active account found after login');
          }
        }
      }
    } catch (err: any) {
      console.error('### DIRECT DEBUG ### Login error:', err);
      // If using B2C and it's a password reset, redirect to reset experience
      if (err.errorMessage && err.errorMessage.includes('AADB2C90118')) {
        handlePasswordReset();
      }
    } finally {
      setIsProcessingAuth(false);
    }
  };
  
  // Handle sign out process
  const handleSignOut = async () => {
    console.log('### DIRECT DEBUG ### handleSignOut called');
    
    if (isProcessingAuth) return;
    
    setIsProcessingAuth(true);
    try {
      // For development mode
      const isDevelopment = process.env.NODE_ENV === 'development' && !window.location.href.includes('localhost:9900');
      
      if (isDevelopment) {
        console.log('### DIRECT DEBUG ### Using development mode logout');
        // Just send the logout message directly
        logout();
      } else {
        // Production mode - Use real MSAL logout
        console.log('### DIRECT DEBUG ### Using production mode logout with MSAL');
        // Sign out of MSAL
        await instance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
        });
        
        // Send logout message through messaging system
        console.log('### DIRECT DEBUG ### Sending logout message');
        logout();
      }
    } catch (err: any) {
      console.error('### DIRECT DEBUG ### Logout error:', err);
    } finally {
      setIsProcessingAuth(false);
    }
  };
  
  // Handle password reset process
  const handlePasswordReset = async () => {
    if (isProcessingAuth) return;
    
    setIsProcessingAuth(true);
    try {
      // For development mode
      const isDevelopment = process.env.NODE_ENV === 'development' && !window.location.href.includes('localhost:9900');
      
      if (isDevelopment) {
        console.log('Using development mode password reset');
        // Show a mock success message
        alert('Development mode: Password reset flow would be triggered here.');
      } else {
        // Production mode - Use real MSAL password reset
        // Redirect to password reset experience
        await instance.loginPopup({
          ...loginRequest,
          authority: b2cPolicies.authorities.passwordReset.authority
        });
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
    } finally {
      setIsProcessingAuth(false);
    }
  };
  
  // Handle profile editing
  const handleEditProfile = async () => {
    if (isProcessingAuth) return;
    
    setIsProcessingAuth(true);
    try {
      // For development mode
      const isDevelopment = process.env.NODE_ENV === 'development' && !window.location.href.includes('localhost:9900');
      
      if (isDevelopment) {
        console.log('Using development mode profile editing');
        // Show a mock success message
        alert('Development mode: Profile editing flow would be triggered here.');
      } else {
        // Production mode - Use real MSAL profile editing
        // Redirect to profile editing experience
        await instance.loginPopup({
          ...loginRequest,
          authority: b2cPolicies.authorities.editProfile.authority
        });
      }
    } catch (err: any) {
      console.error('Edit profile error:', err);
    } finally {
      setIsProcessingAuth(false);
    }
  };
  
  // Dismiss error message
  const handleDismissError = () => {
    setShowError(false);
  };
  
  // Toggle debug panel
  const toggleDebugPanel = () => {
    setShowDebugPanel((prev) => !prev);
  };
  
  console.log('### DIRECT DEBUG ### AuthPanel rendering, isAuthenticated:', isAuthenticated);
  
  // Display the authentication UI
  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Quodsi</h1>
          <p className="text-sm mt-1">Simulation Modeling for Lucidchart</p>
        </div>
        <button
          onClick={toggleDebugPanel}
          className="text-xs text-gray-500 hover:text-gray-700"
          title="Toggle Debug Panel"
        >
          {showDebugPanel ? "Hide Debug" : "Debug"}
        </button>
      </div>

      {/* Show error if present and not dismissed */}
      {error && showError && (
        <AuthError
          error={{ message: error }}
          onDismiss={handleDismissError}
          onRetry={handleSignIn}
          onPasswordReset={handlePasswordReset}
        />
      )}

      {/* Show debug panel if enabled */}
      {showDebugPanel && <DebugPanel />}

      {isAuthenticated ? (
        // Authenticated view
        <div className="flex flex-col">
          <div className="p-3 bg-gray-100 rounded mb-4">
            <p className="font-medium">Signed in as:</p>
            <p className="text-sm">{userInfo?.displayName || userInfo?.email}</p>
            <p className="text-xs text-gray-600">{userInfo?.email}</p>
          </div>

          <div className="flex space-x-2 mb-6">
            <button
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleEditProfile}
              disabled={isProcessingAuth}
            >
              Edit Profile
            </button>
            <button
              className="flex-1 py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={handleSignOut}
              disabled={isProcessingAuth}
            >
              Sign Out
            </button>
          </div>

          <div className="mt-auto">
            <h2 className="font-medium mb-2">Quick Links</h2>
            <ul className="text-sm text-blue-600">
              <li className="mb-1">
                <a
                  href="https://example.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Documentation
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://example.com/tutorials"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Video Tutorials
                </a>
              </li>
              <li className="mb-1">
                <a
                  href="https://example.com/support"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        // Unauthenticated view
        <div className="flex flex-col">
          <p className="mb-4">
            Welcome to Quodsi! Sign in to access simulation modeling tools for
            your Lucidchart diagrams.
          </p>

          <button
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 mb-3"
            onClick={handleSignIn}
            disabled={isProcessingAuth}
          >
            {isProcessingAuth ? "Signing in..." : "Sign In / Sign Up"}
          </button>

          <button
            className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 mb-6"
            onClick={handlePasswordReset}
            disabled={isProcessingAuth}
          >
            Forgot Password?
          </button>

          <div className="mt-auto">
            <h2 className="font-medium mb-2">About Quodsi</h2>
            <p className="text-sm">
              Quodsi adds process simulation capabilities to your Lucidchart
              diagrams. Convert your flowcharts into interactive simulations to
              analyze performance and identify bottlenecks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPanel;