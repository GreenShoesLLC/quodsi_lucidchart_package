// src/auth/msalSetup.ts
import { PublicClientApplication, EventType, IPublicClientApplication } from "@azure/msal-browser";
import { createMsalConfig, b2cPolicies } from "../auth/config";

/**
 * Creates a configured MSAL instance
 * @returns Configured PublicClientApplication instance
 */
export const createMsalInstance = (): IPublicClientApplication => {
  console.log("[MSAL] Creating MSAL instance...");

  // Create MSAL configuration with sign-in policy
  const msalConfig = createMsalConfig(b2cPolicies.signUpSignIn);

  // Initialize MSAL instance with the configuration
  const msalInstance = new PublicClientApplication(msalConfig);

  // Only configure event handlers here - NO redirect handling yet
  return configureEventHandlers(msalInstance);
};

/**
 * Configures event handlers for an MSAL instance
 * @param msalInstance The MSAL instance to configure
 * @returns The configured MSAL instance
 */
export const configureEventHandlers = (msalInstance: IPublicClientApplication): IPublicClientApplication => {
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

  return msalInstance;
};

/**
 * Handles redirect promise after MSAL is initialized
 * IMPORTANT: This must be called AFTER msalInstance.initialize() completes
 * @param msalInstance The initialized MSAL instance
 */
export const handleRedirectAfterInitialization = async (msalInstance: IPublicClientApplication): Promise<void> => {
  try {
    // Process the redirect response if returning from a redirect
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log("[MSAL] Redirect response processed successfully");
    }
  } catch (error) {
    console.error("[MSAL] Redirect authentication error:", error);
  }
};
