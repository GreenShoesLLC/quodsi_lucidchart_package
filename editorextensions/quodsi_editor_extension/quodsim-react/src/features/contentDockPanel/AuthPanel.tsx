import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useAuthPanelState } from "./useAuthPanelState";
import { QuodsiUserInfo } from "@quodsi/shared";
import { loginRequest, b2cPolicies } from "../../config/msalConfig";
import { debugService } from "../../messaging/utils/debugService";

// Create dedicated logger for AuthPanel
const logger = debugService.forComponent("AuthPanel");

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
  // Extract just what we need from the auth state
  const { isAuthenticated, userInfo } = useAuthPanelState();

  return (
    <div className="mb-4 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
      <h3 className="font-bold mb-1">Auth Debug</h3>
      <div>
        <p>IsAuthenticated: {isAuthenticated ? "true" : "false"}</p>
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
    silentAuthInProgress,
    error,
    login,
    logout,
    syncAuthStateNow,
  } = useAuthPanelState();

  const [showError, setShowError] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false); // Hide by default
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  
  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Reset error visibility when the error changes
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  // Log authentication state for debugging
  useEffect(() => {
    if (silentAuthInProgress === false) {
      logger.log("Auth state initialized", {
        isAuthenticated,
        hasUserInfo: !!userInfo,
        silentAuthInProgress,
      });
    }
  }, [isAuthenticated, userInfo, silentAuthInProgress]);

  // Force sync authentication state with MSAL accounts
  useEffect(() => {
    // Only run this if not already authenticated and there are MSAL accounts
    if (!isAuthenticated && accounts.length > 0 && !isProcessingAuth) {
      logger.log("Detected account mismatch - fixing authentication state");

      // Get the account info
      const account = accounts[0];

      // Create user info
      const user: QuodsiUserInfo = {
        id: account.localAccountId,
        email: account.username,
        displayName: account.name || account.username,
      };

      // First try to set the active account
      try {
        instance.setActiveAccount(account);
      } catch (e) {
        console.warn("Failed to set active account:", e);
      }

      // Use the direct sync function to immediately update the auth state
      syncAuthStateNow(true, user);
    }
  }, [isAuthenticated, accounts, isProcessingAuth, syncAuthStateNow, instance]);

  // Handle sign in process
  const handleSignIn = async () => {
    logger.log("handleSignIn called");

    if (isProcessingAuth) return;

    setIsProcessingAuth(true);
    try {
      // For development mode - check if we're in a development environment
      const isDevelopment =
        process.env.NODE_ENV === "development" &&
        !window.location.href.includes("localhost:9900");

      if (isDevelopment) {
        logger.log("Using development mode authentication");
        // Simulate login success with mock data
        const mockUser: QuodsiUserInfo = {
          id: "dev-user-123",
          email: "dev@example.com",
          displayName: "Development User",
        };

        // Create a mock token
        const mockToken = "dev-token-" + Date.now();

        // Send login success message
        logger.log("Sending mock login success message");
        login(mockToken, mockUser, false);
      } else {
        // Production mode - Use real MSAL authentication
        logger.log("Using production mode authentication with MSAL");

        // Check if this is a sign-in after a recent sign-out
        const hasJustSignedOut =
          window.sessionStorage.getItem("quodsi_just_signed_out") === "true";
        const signOutTime = parseInt(
          window.sessionStorage.getItem("quodsi_signout_time") || "0",
          10
        );
        const timeSinceSignOut = Date.now() - signOutTime;
        const isRecentSignOut = timeSinceSignOut < 60000; // Within 1 minute

        if (hasJustSignedOut && isRecentSignOut) {
          logger.log(
            `Detected sign-in attempt ${timeSinceSignOut}ms after sign-out`
          );

          // Clear MSAL cache for this special case
          try {
            // Try to clear any existing accounts first
            const existingAccounts = instance.getAllAccounts();
            if (existingAccounts.length > 0) {
              logger.log(
                `Found ${existingAccounts.length} accounts before sign-in, clearing cache`
              );
            }

            // Clear session storage to ensure a clean state
            Object.keys(sessionStorage).forEach((key) => {
              if (
                key.startsWith("msal.") ||
                key.includes("login.") ||
                key.includes("authority")
              ) {
                try {
                  sessionStorage.removeItem(key);
                } catch (e) {
                  logger.error(
                    `Error clearing session storage item: ${key}`,
                    e
                  );
                }
              }
            });

            // Clear sign-out flags after using them
            window.sessionStorage.removeItem("quodsi_just_signed_out");
            window.sessionStorage.removeItem("quodsi_signout_time");
          } catch (e) {
            logger.error("Error clearing cache:", e);
          }
        }

        // Login with popup using MSAL - make sure authority is included
        const authRequest = {
          ...loginRequest,
          authority: b2cPolicies.authorities.signUpSignIn.authority,
          prompt: "login",
        };

        logger.log("Login request:", {
          scopes: authRequest.scopes,
          authority: authRequest.authority,
          prompt: authRequest.prompt,
        });

        const result = await instance.loginPopup(authRequest);
        logger.log(
          "MSAL login successful, result:",
          result ? "Success" : "No result"
        );

        if (result) {
          // Extract user information from the account
          const account =
            instance.getActiveAccount() ||
            (accounts.length > 0 ? accounts[0] : null);
          logger.log("Active account:", account);

          if (account) {
            const newUser = accounts.length === 1; // Assume first login means new user

            // Create user info from account
            const user: QuodsiUserInfo = {
              id: account.localAccountId,
              email: account.username,
              displayName: account.name,
            };

            // Send login success message
            logger.log("Sending login success message with user:", user);
            login(result.idToken, user, newUser);
          } else {
            logger.log(
              "No active account found after login, attempting recovery"
            );

            // Recovery attempt 1: Look for any accounts in MSAL
            const allAccounts = instance.getAllAccounts();
            logger.log("Found", allAccounts.length, "accounts");

            if (allAccounts.length > 0) {
              // Use the first account we find
              const recoveredAccount = allAccounts[0];
              logger.log("Using recovered account:", recoveredAccount.username);

              // Create user info from recovered account
              const user: QuodsiUserInfo = {
                id: recoveredAccount.localAccountId,
                email: recoveredAccount.username,
                displayName: recoveredAccount.name,
              };

              // Try to set this as the active account
              try {
                instance.setActiveAccount(recoveredAccount);
                logger.log("Set active account successfully");
              } catch (setActiveError) {
                logger.warn("Failed to set active account:", setActiveError);
              }

              // Send login success message with the recovered account
              logger.log("Sending login success message with recovered user");
              login(result.idToken, user, false);
            } else {
              // If recovery failed, throw an error to be caught by the catch block
              throw new Error(
                "No active account found after login and recovery attempts failed"
              );
            }
          }
        }
      }
    } catch (err: any) {
      logger.error("Login error:", err);
      // If using B2C and it's a password reset, redirect to reset experience
      if (err.errorMessage && err.errorMessage.includes("AADB2C90118")) {
        handlePasswordReset();
      }
    } finally {
      setIsProcessingAuth(false);
    }
  };

  // Handle sign out process
  const handleSignOut = async () => {
    logger.log("handleSignOut called");

    if (isProcessingAuth) return;

    setIsProcessingAuth(true);
    try {
      // For development mode
      const isDevelopment =
        process.env.NODE_ENV === "development" &&
        !window.location.href.includes("localhost:9900");

      if (isDevelopment) {
        logger.log("Using development mode logout");
        // Just send the logout message directly
        logout();
      } else {
        // Set a flag to remember that we just signed out
        // This will help us handle the sign-in-after-sign-out case better
        try {
          window.sessionStorage.setItem("quodsi_just_signed_out", "true");
          window.sessionStorage.setItem(
            "quodsi_signout_time",
            Date.now().toString()
          );
        } catch (e) {
          logger.error("Error setting sign-out flags:", e);
        }

        // Production mode - Use real MSAL logout
        logger.log("Using production mode logout with MSAL");
        // Sign out of MSAL
        await instance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
        });

        // Send logout message through messaging system
        logger.log("Sending logout message");
        logout();
      }
    } catch (err: any) {
      logger.error("Logout error:", err);
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
      const isDevelopment =
        process.env.NODE_ENV === "development" &&
        !window.location.href.includes("localhost:9900");

      if (isDevelopment) {
        console.log("Using development mode password reset");
        // Show a mock success message
        alert("Development mode: Password reset flow would be triggered here.");
      } else {
        // Production mode - Use real MSAL password reset
        // Redirect to password reset experience
        await instance.loginPopup({
          ...loginRequest,
          authority: b2cPolicies.authorities.passwordReset.authority,
        });
      }
    } catch (err: any) {
      logger.error("Password reset error:", err);
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
      const isDevelopment =
        process.env.NODE_ENV === "development" &&
        !window.location.href.includes("localhost:9900");

      if (isDevelopment) {
        console.log("Using development mode profile editing");
        // Show a mock success message
        alert(
          "Development mode: Profile editing flow would be triggered here."
        );
      } else {
        // Production mode - Use real MSAL profile editing
        // Redirect to profile editing experience
        await instance.loginPopup({
          ...loginRequest,
          authority: b2cPolicies.authorities.editProfile.authority,
        });
      }
    } catch (err: any) {
      logger.error("Edit profile error:", err);
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

  logger.log("AuthPanel rendering, isAuthenticated:", isAuthenticated);

  // Display the authentication UI
  return (
    <div className="flex flex-col h-full p-4">
      {/* Show error if present and not dismissed */}
      {error && showError && (
        <AuthError
          error={{ message: error }}
          onDismiss={handleDismissError}
          onRetry={handleSignIn}
          onPasswordReset={handlePasswordReset}
        />
      )}

      {isAuthenticated ? (
        // Authenticated view
        <div className="flex flex-col">
          <div className="p-3 bg-gray-100 rounded mb-4">
            <p className="font-medium">Signed in as:</p>
            <p className="text-sm">
              {userInfo?.displayName || userInfo?.email}
            </p>
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

      {/* Debug controls at bottom (development only) */}
      {isDevelopment && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">Debug Tools</span>
            <button
              onClick={toggleDebugPanel}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
              title="Toggle Debug Panel"
            >
              {showDebugPanel ? "Hide" : "Show"}
            </button>
          </div>
          
          {/* Debug panel */}
          {showDebugPanel && <DebugPanel />}
        </div>
      )}
    </div>
  );
};

export default AuthPanel;
