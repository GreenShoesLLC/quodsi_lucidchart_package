// src/index.tsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/quodsi-styles.css";
import reportWebVitals from "./reportWebVitals";
import QuodsiApp from "./QuodsiApp";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { AuthProvider } from "./auth/AuthProvider";
import { msalConfig } from "./auth/authConfig";

console.log("index.tsx called");

// Initialize MSAL instance with detailed logging
const msalInstance = new PublicClientApplication(msalConfig);

// First make sure MSAL is initialized before rendering the app
console.log("[MSAL] Initializing MSAL instance...");

// Create a component that ensures MSAL is initialized before rendering children
const MsalInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMsalInitialized, setIsMsalInitialized] = useState(false);
  const [msalError, setMsalError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        // Explicitly initialize MSAL
        await msalInstance.initialize();
        console.log("[MSAL] Initialization complete");
        setIsMsalInitialized(true);
      } catch (error) {
        console.error("[MSAL] Initialization failed:", error);
        setMsalError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeMsal();
  }, []);

  if (msalError) {
    return (
      <div className="p-4 bg-red-100 text-red-700">
        <h2 className="font-bold">Authentication Error</h2>
        <p>Failed to initialize authentication: {msalError.message}</p>
        <button 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isMsalInitialized) {
    return (
      <div className="p-4">
        <p>Initializing authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
};

// Register event callbacks for better debugging
msalInstance.addEventCallback((event) => {
  // Only log during development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MSAL Event] ${event.eventType}:`, event.payload);
  }

  // Handle specific auth events
  switch (event.eventType) {
    case EventType.LOGIN_SUCCESS:
      console.log("[MSAL] Login success");
      break;
    case EventType.LOGIN_FAILURE:
      console.log("[MSAL] Login failed", event.error);
      break;
    case EventType.LOGOUT_SUCCESS:
      console.log("[MSAL] Logout success");
      break;
    case EventType.ACQUIRE_TOKEN_SUCCESS:
      console.log("[MSAL] Token acquired successfully");
      break;
    case EventType.ACQUIRE_TOKEN_FAILURE:
      console.log("[MSAL] Token acquisition failed", event.error);
      break;
  }
});

// Handle successful redirect authentication if returning from a redirect
msalInstance.handleRedirectPromise().catch(error => {
  console.error("[MSAL] Redirect authentication error:", error);
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <MsalInitializer>
      <AuthProvider msalInstance={msalInstance}>
        <QuodsiApp />
      </AuthProvider>
    </MsalInitializer>
  </React.StrictMode>
);

reportWebVitals();