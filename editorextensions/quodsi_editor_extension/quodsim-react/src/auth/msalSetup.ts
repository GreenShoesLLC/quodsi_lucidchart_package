// src/auth/msalSetup.ts
import { PublicClientApplication, EventType, IPublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

/**
 * Creates a configured MSAL instance
 * @returns Configured PublicClientApplication instance
 */
export const createMsalInstance = (): IPublicClientApplication => {
  console.log("[MSAL] Creating MSAL instance...");
  
  // Initialize MSAL instance with the configuration
  const msalInstance = new PublicClientApplication(msalConfig);
  
  return configureMsalInstance(msalInstance);
};

/**
 * Configures an MSAL instance with event handlers and initialization
 * @param msalInstance The MSAL instance to configure
 * @returns The configured MSAL instance
 */
export const configureMsalInstance = (msalInstance: IPublicClientApplication): IPublicClientApplication => {
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

  return msalInstance;
};
