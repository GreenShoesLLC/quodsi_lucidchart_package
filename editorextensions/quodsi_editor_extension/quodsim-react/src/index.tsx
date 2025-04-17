// src/index.tsx
import React from "react";
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
    <AuthProvider msalInstance={msalInstance}>
      <QuodsiApp />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();