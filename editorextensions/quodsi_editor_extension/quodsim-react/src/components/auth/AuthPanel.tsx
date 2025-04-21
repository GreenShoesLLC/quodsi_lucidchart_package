// src/components/auth/AuthPanel.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { AuthError } from "./AuthError";
import { DebugPanel } from "./DebugPanel";
import { authErrorHandler } from "../../services/AuthErrorHandler";

/**
 * AuthPanel component for authentication UI
 * 
 * This component uses the refactored authentication hooks via the AuthProvider
 * but maintains the same UI and functionality as before
 */
export const AuthPanel: React.FC = () => {
  const {
    isAuthenticated,
    userInfo,
    isProcessingAuth,
    error,
    handleSignIn,
    handleSignOut,
    handlePasswordReset,
    handleEditProfile,
  } = useAuth();
  
  const [showError, setShowError] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Convert error string to AuthError type if present
  const authError = error ? authErrorHandler.createGenericError(error) : null;

  // Add effect to detect when auth is initialized
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 1500); // Give MSAL 1.5 seconds to initialize

    return () => clearTimeout(initTimer);
  }, []);

  // Dismiss error message
  const handleDismissError = () => {
    setShowError(false);
  };

  // Reset error visibility when the error changes
  React.useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  // Toggle debug panel visibility
  const toggleDebugPanel = () => {
    setShowDebugPanel((prev) => !prev);
  };

  // If still initializing, show a loading spinner
  if (isInitializing) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Initializing authentication...</p>
      </div>
    );
  }

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
      {authError && showError && (
        <AuthError
          error={authError}
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
            <p className="text-sm">{userInfo?.name}</p>
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
