// src/auth/msal-helpers.ts
import { IPublicClientApplication } from "@azure/msal-browser";

// Global variable to store the MSAL instance
let globalMsalInstance: IPublicClientApplication | null = null;

/**
 * Sets the MSAL instance for global access
 * Call this in AuthProvider initialization
 */
export const setMsalInstanceForHandlers = (instance: IPublicClientApplication): void => {
    globalMsalInstance = instance;
};

/**
 * Gets the MSAL instance for use in message handlers
 */
export const getMsalInstanceFromContext = (): IPublicClientApplication | null => {
    return globalMsalInstance;
};