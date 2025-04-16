# MSAL.js Integration in React Application

This document provides detailed instructions for integrating the Microsoft Authentication Library (MSAL.js) into the Quodsi React application to enable Azure AD B2C authentication within the LucidChart iframe environment.

## Overview

MSAL.js is Microsoft's authentication library that provides seamless sign-in and token acquisition for applications using Azure AD B2C. When implementing authentication within a LucidChart iframe, special considerations are needed to ensure a smooth authentication experience.

## Prerequisites

- React application set up (quodsim-react)
- Azure AD B2C tenant configured
- User flows created (sign-up/sign-in, password reset)
- Application registered in Azure AD B2C

## Step 1: Install Required Packages

Install MSAL.js packages:

```bash
npm install @azure/msal-browser @azure/msal-react
```

## Step 2: Create MSAL Configuration

Create an authentication configuration file:

```javascript
// src/auth/authConfig.js
import { LogLevel } from "@azure/msal-browser";

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_B2C_CLIENT_ID,
    authority: `https://${process.env.REACT_APP_B2C_TENANT}.b2clogin.com/${process.env.REACT_APP_B2C_TENANT}.onmicrosoft.com/${process.env.REACT_APP_B2C_POLICY}`,
    knownAuthorities: [`${process.env.REACT_APP_B2C_TENANT}.b2clogin.com`],
    redirectUri: process.env.REACT_APP_B2C_REDIRECT_URI,
    postLogoutRedirectUri: process.env.REACT_APP_B2C_POST_LOGOUT_REDIRECT_URI,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored (sessionStorage or localStorage)
    storeAuthStateInCookie: true, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    allowRedirectInIframe: true,    // Required when running in iframe
    iframeHashTimeout: 10000,       // Increase timeout for iframe scenarios
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          default:
            break;
        }
      },
      logLevel: LogLevel.Verbose
    }
  }
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest = {
  scopes: ["openid", "profile"]
};

/**
 * Add here the scopes to request when obtaining an access token for API calls.
 * For more information, visit: 
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/resources-and-scopes.md
 */
export const apiRequest = {
  scopes: [
    `https://${process.env.REACT_APP_B2C_TENANT}.onmicrosoft.com/api/Quodsi.Read`,
    `https://${process.env.REACT_APP_B2C_TENANT}.onmicrosoft.com/api/Quodsi.Write`
  ]
};

// Policy/authority configuration for password reset
export const b2cPolicies = {
  authorities: {
    signUpSignIn: {
      authority: `https://${process.env.REACT_APP_B2C_TENANT}.b2clogin.com/${process.env.REACT_APP_B2C_TENANT}.onmicrosoft.com/${process.env.REACT_APP_B2C_POLICY}`
    },
    passwordReset: {
      authority: `https://${process.env.REACT_APP_B2C_TENANT}.b2clogin.com/${process.env.REACT_APP_B2C_TENANT}.onmicrosoft.com/B2C_1_PWReset`
    }
  }
};
```

## Step 3: Set Up MSAL Provider in Your Application

Initialize MSAL and add the provider to your application:

```jsx
// src/index.jsx
import React from "react";
import ReactDOM from "react-dom";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./auth/authConfig";
import App from "./App";
import "./index.css";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Check if there are already users signed in
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
  msalInstance.setActiveAccount(accounts[0]);
}

// Default to using popup for B2C in iframe environment
msalInstance.setDefaultPopupExperience();

// Listen for auth events
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS) {
    const account = event.payload;
    msalInstance.setActiveAccount(account);
    
    // Notify parent frame (LucidChart) about successful authentication
    if (window.parent !== window) {
      window.parent.postMessage({
        source: "quodsi",
        type: "AUTH_STATE_CHANGE",
        isAuthenticated: true
      }, "https://lucid.app");
    }
  } else if (event.eventType === EventType.LOGOUT_SUCCESS) {
    // Notify parent frame about logout
    if (window.parent !== window) {
      window.parent.postMessage({
        source: "quodsi",
        type: "AUTH_STATE_CHANGE",
        isAuthenticated: false
      }, "https://lucid.app");
    }
  }
});

ReactDOM.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
```

## Step 4: Create Authentication Service

Create an authentication service to handle token acquisition and management:

```javascript
// src/services/authService.js
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalConfig, loginRequest, apiRequest, b2cPolicies } from "../auth/authConfig";

export default class AuthService {
  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
    this.accounts = this.msalInstance.getAllAccounts();
    if (this.accounts.length > 0) {
      this.msalInstance.setActiveAccount(this.accounts[0]);
    }
  }

  /**
   * Get the active account
   */
  getAccount() {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      return null;
    }
    return this.msalInstance.getActiveAccount() || accounts[0];
  }

  /**
   * Login using popup (recommended for iframe scenarios)
   */
  async loginPopup() {
    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      this.msalInstance.setActiveAccount(response.account);
      return response;
    } catch (error) {
      // Handle specific B2C error codes
      if (error.errorCode === "AADB2C90118") {
        // Password reset error code
        try {
          // Navigate to password reset experience
          return await this.msalInstance.loginPopup({
            ...loginRequest,
            authority: b2cPolicies.authorities.passwordReset.authority
          });
        } catch (resetError) {
          console.error("Error during password reset flow:", resetError);
          throw resetError;
        }
      }
      console.error("Error during login:", error);
      throw error;
    }
  }

  /**
   * Logout using popup
   */
  async logoutPopup() {
    try {
      await this.msalInstance.logoutPopup();
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken() {
    const account = this.getAccount();
    if (!account) {
      throw new Error("No active account! Sign in required.");
    }
    
    try {
      // Try to get token silently first
      const response = await this.msalInstance.acquireTokenSilent({
        ...apiRequest,
        account: account
      });
      return response.accessToken;
    } catch (error) {
      // If silent token acquisition fails, fallback to popup
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await this.msalInstance.acquireTokenPopup({
            ...apiRequest,
            account: account
          });
          return response.accessToken;
        } catch (popupError) {
          console.error("Error acquiring token with popup:", popupError);
          throw popupError;
        }
      } else {
        console.error("Error acquiring token silently:", error);
        throw error;
      }
    }
  }

  /**
   * Get user information from ID token claims
   */
  getUserInfo() {
    const account = this.getAccount();
    if (!account) {
      return null;
    }
    
    return {
      id: account.idTokenClaims.oid || account.idTokenClaims.sub,
      username: account.username,
      name: account.name,
      email: account.idTokenClaims.emails ? account.idTokenClaims.emails[0] : account.username,
      // Get subscription information if available in token
      subscriptionStatus: account.idTokenClaims.subscriptionStatus,
      subscriptionTier: account.idTokenClaims.subscriptionTier
    };
  }
}

// Create singleton instance
export const authService = new AuthService();
```

## Step 5: Create Authentication Context

Create a React context to provide authentication state throughout your application:

```jsx
// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { authService } from "../services/authService";

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const account = useAccount(accounts[0]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update user info when account changes
  useEffect(() => {
    if (account) {
      const userInfo = authService.getUserInfo();
      setUser(userInfo);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [account]);

  // Login function
  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.loginPopup();
    } catch (error) {
      setError(error.message);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logoutPopup();
    } catch (error) {
      setError(error.message);
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get access token for API calls
  const getAccessToken = async () => {
    try {
      return await authService.getAccessToken();
    } catch (error) {
      setError(error.message);
      console.error("Token acquisition error:", error);
      throw error;
    }
  };

  // Context value
  const contextValue = {
    isAuthenticated: !!user,
    user,
    isLoading,
    error,
    login,
    logout,
    getAccessToken
  };

  // Provide context value to children
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

## Step 6: Add Authentication Components

Create login and logout buttons:

```jsx
// src/components/auth/LoginButton.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";

export const LoginButton = () => {
  const { isAuthenticated, login, logout, isLoading } = useAuth();

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
    } else {
      login();
    }
  };

  return (
    <button
      onClick={handleAuthAction}
      disabled={isLoading}
      className="auth-button"
    >
      {isLoading ? "Processing..." : isAuthenticated ? "Sign Out" : "Sign In"}
    </button>
  );
};
```

Create a protected route component:

```jsx
// src/components/auth/ProtectedContent.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";

export const ProtectedContent = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading authentication state...</div>;
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="unauthenticated">
        <h2>Please sign in</h2>
        <p>You need to authenticate to access this content.</p>
      </div>
    );
  }

  return <>{children}</>;
};
```

## Step 7: Implement API Service with Authentication

Create a base API service that includes authentication tokens:

```javascript
// src/services/apiService.js
import { authService } from "./authService";

export default class ApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.REACT_APP_API_BASE_URL;
  }

  /**
   * Make authenticated API request
   */
  async fetchWithAuth(endpoint, options = {}) {
    try {
      // Get access token
      const token = await authService.getAccessToken();
      
      // Build request options with authentication
      const requestOptions = {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${token}`,
          "Content-Type": options.headers?.["Content-Type"] || "application/json"
        }
      };
      
      // Make API request
      const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
      
      // Handle non-200 responses
      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        
        // Handle authentication errors
        if (response.status === 401) {
          // Token might be expired, try to refresh
          console.warn("Authentication error, token might be expired");
        }
        
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      // Parse response
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed: ${error.message}`);
      throw error;
    }
  }
  
  // Helper methods for common HTTP methods
  
  async get(endpoint) {
    return this.fetchWithAuth(endpoint);
  }
  
  async post(endpoint, data) {
    return this.fetchWithAuth(endpoint, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
  
  async put(endpoint, data) {
    return this.fetchWithAuth(endpoint, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }
  
  async patch(endpoint, data) {
    return this.fetchWithAuth(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  }
  
  async delete(endpoint) {
    return this.fetchWithAuth(endpoint, {
      method: "DELETE"
    });
  }
}

// Create singleton instance
export const apiService = new ApiService();
```

## Step 8: Update App Component to Use Authentication

Update your main App component to include the authentication provider:

```jsx
// src/App.jsx
import React, { useEffect } from "react";
import { MsalProvider } from "@azure/msal-react";
import { AuthProvider } from "./contexts/AuthContext";
import { LoginButton } from "./components/auth/LoginButton";
import { ProtectedContent } from "./components/auth/ProtectedContent";
import { FrameMessageHandler } from "./components/FrameMessageHandler";
import "./App.css";

// Main application component
function App() {
  return (
    <AuthProvider>
      <div className="quodsi-app">
        {/* Handle messages from LucidChart iframe */}
        <FrameMessageHandler />
        
        <header className="app-header">
          <h1>Quodsi Simulation</h1>
          <LoginButton />
        </header>
        
        <main className="app-content">
          <ProtectedContent
            fallback={
              <div className="welcome-screen">
                <h2>Welcome to Quodsi</h2>
                <p>Please sign in to start creating process simulations.</p>
                <LoginButton />
              </div>
            }
          >
            {/* Protected application content */}
            <div className="dashboard">
              <h2>Your Simulations Dashboard</h2>
              {/* Simulation components go here */}
            </div>
          </ProtectedContent>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
```

## Step 9: Implement Cross-Domain Communication

Create a component to handle messages from the LucidChart iframe:

```jsx
// src/components/FrameMessageHandler.jsx
import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export const FrameMessageHandler = () => {
  const { isAuthenticated, login } = useAuth();
  
  useEffect(() => {
    // Function to handle messages from parent frame
    const handleMessage = (event) => {
      // Verify message origin for security
      if (event.origin !== "https://lucid.app" && 
          event.origin !== "https://chart.lucid.app" && 
          event.origin !== "https://app.lucid.co") {
        console.warn("Received message from untrusted origin:", event.origin);
        return;
      }
      
      // Process message
      const message = event.data;
      if (!message || message.source !== "lucidchart") {
        return;
      }
      
      // Handle specific message types
      switch (message.type) {
        case "INIT":
          // Notify parent about current auth state
          sendAuthStateToParent(isAuthenticated);
          break;
        
        case "REQUEST_AUTH":
          // Parent is requesting authentication
          if (!isAuthenticated) {
            login();
          }
          break;
        
        // Handle other message types
        default:
          console.log("Unhandled message type:", message.type);
      }
    };
    
    // Add message event listener
    window.addEventListener("message", handleMessage);
    
    // Send ready message to parent
    if (window.parent !== window) {
      window.parent.postMessage({
        source: "quodsi",
        type: "READY"
      }, "https://lucid.app");
    }
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isAuthenticated, login]);
  
  // Send authentication state to parent frame
  const sendAuthStateToParent = (isAuthenticated) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        source: "quodsi",
        type: "AUTH_STATE_CHANGE",
        isAuthenticated
      }, "https://lucid.app");
    }
  };
  
  // Effect to notify parent about auth state changes
  useEffect(() => {
    sendAuthStateToParent(isAuthenticated);
  }, [isAuthenticated]);
  
  // This component doesn't render anything
  return null;
};
```

## Step 10: Handle Authentication Errors

Create an error handling component:

```jsx
// src/components/auth/AuthError.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

export const AuthError = () => {
  const { error, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  
  // Show error when it occurs
  useEffect(() => {
    if (error && !isLoading) {
      setVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, isLoading]);
  
  if (!visible || !error) {
    return null;
  }
  
  return (
    <div className="auth-error-container">
      <div className="auth-error">
        <h3>Authentication Error</h3>
        <p>{error}</p>
        <button onClick={() => setVisible(false)}>Dismiss</button>
      </div>
    </div>
  );
};
```

Add the error component to your app:

```jsx
// Update App.jsx
import { AuthError } from "./components/auth/AuthError";

function App() {
  return (
    <AuthProvider>
      <div className="quodsi-app">
        {/* Add error handling component */}
        <AuthError />
        
        {/* Rest of the app */}
        ...
      </div>
    </AuthProvider>
  );
}
```

## Step 11: Configure Environment Variables

Create a `.env` file for your React app:

```
# .env.development
REACT_APP_B2C_CLIENT_ID=your-b2c-client-id
REACT_APP_B2C_TENANT=your-tenant-name
REACT_APP_B2C_POLICY=B2C_1_SUSI
REACT_APP_B2C_REDIRECT_URI=http://localhost:3000/auth-callback
REACT_APP_B2C_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
REACT_APP_API_BASE_URL=http://localhost:7071/api
```

```
# .env.production
REACT_APP_B2C_CLIENT_ID=your-b2c-client-id
REACT_APP_B2C_TENANT=your-tenant-name
REACT_APP_B2C_POLICY=B2C_1_SUSI
REACT_APP_B2C_REDIRECT_URI=https://app.quodsi.com/auth-callback
REACT_APP_B2C_POST_LOGOUT_REDIRECT_URI=https://app.quodsi.com
REACT_APP_API_BASE_URL=https://api.quodsi.com/api
```

## Step 12: Test Authentication Flow

To test the complete authentication flow:

1. Start your React app:
   ```bash
   npm start
   ```

2. Open the app in a browser and click the "Sign In" button

3. Verify you can complete the sign-in process and are authenticated

4. Test API calls using the authenticated state

5. Test logout functionality

## Step 13: Create Auth Callback Page

Create a dedicated authentication callback page:

```jsx
// src/pages/AuthCallback.jsx
import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

const AuthCallback = () => {
  const { instance } = useMsal();
  const [status, setStatus] = useState("Processing authentication response...");
  
  useEffect(() => {
    // Handle the auth response
    const handleRedirectPromise = async () => {
      try {
        // Process the response
        await instance.handleRedirectPromise();
        
        // Close the popup if in popup mode
        if (window.opener && window.opener !== window) {
          window.close();
        }
        
        // Set success message
        setStatus("Authentication successful! You can close this window.");
        
        // Notify parent if in iframe
        if (window.parent !== window) {
          window.parent.postMessage({
            source: "quodsi",
            type: "AUTH_CALLBACK_SUCCESS"
          }, "https://lucid.app");
        }
      } catch (error) {
        console.error("Error handling auth response:", error);
        setStatus(`Authentication failed: ${error.message}`);
      }
    };
    
    handleRedirectPromise();
  }, [instance]);
  
  return (
    <div className="auth-callback">
      <h2>Quodsi Authentication</h2>
      <p>{status}</p>
    </div>
  );
};

export default AuthCallback;
```

Add the callback page to your routing:

```jsx
// Update your routing configuration
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthCallback from "./pages/AuthCallback";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/" element={<MainApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

## Step 14: Handle Iframe-Specific Authentication Issues

### Create a Popup Authentication Helper

For more reliable iframe authentication, create a helper that handles popup specifics:

```javascript
// src/utils/popupAuth.js
/**
 * Open a centered popup window
 */
export function openPopupWindow(url, name, width = 600, height = 600) {
  const left = window.innerWidth / 2 - width / 2 + window.screenX;
  const top = window.innerHeight / 2 - height / 2 + window.screenY;
  
  const popup = window.open(
    url,
    name,
    `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
  );
  
  if (popup) {
    popup.focus();
  } else {
    console.warn("Popup blocked! Please allow popups for this site.");
  }
  
  return popup;
}

/**
 * Handle popup-based authentication
 */
export function handlePopupAuth(msalInstance, request) {
  return new Promise((resolve, reject) => {
    try {
      // Start the login operation
      msalInstance.loginPopup(request)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}
```

Update your authentication service to use this helper:

```javascript
// Update authService.js
import { openPopupWindow, handlePopupAuth } from "../utils/popupAuth";

// Update loginPopup method
async loginPopup() {
  try {
    // Use popup helper
    return await handlePopupAuth(this.msalInstance, loginRequest);
  } catch (error) {
    // Handle errors
    // ...
  }
}
```

## Next Steps

After implementing MSAL.js integration:

1. Implement [iframe communication](./iframe_communication.md) for better integration with LucidChart
2. Configure [subscription checks](./subscription_checks.md) to determine user access
3. Set up [error handling](./error_handling.md) for authentication issues
4. Integrate with [backend API](../05-backend_implementation/token_validation.md) for secure data access
