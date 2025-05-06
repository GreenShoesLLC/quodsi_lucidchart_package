/**
 * msalConfig.ts
 * 
 * Configuration for Microsoft Authentication Library (MSAL)
 * Handles redirect URIs, cache settings, and MSAL instance configuration
 */

import { Configuration } from '@azure/msal-browser';
import { tenantConfig } from './authPolicies';

/**
 * Get the redirect URI configuration based on the current environment
 */
export const getRedirectUri = (): string => {
  try {
    const currentUrl = window.location.href;

    // When running in Lucidchart's development environment
    if (currentUrl.includes('localhost:9900')) {
      return 'http://localhost:9900/resources/quodsim-react/index.html';
    }

    // When running in Lucidchart production
    if (currentUrl.includes('lucid.app') || currentUrl.includes('lucidchart.com')) {
      return currentUrl; // Use the exact current URL
    }

    // For local React development
    return 'http://localhost:3000/';
  } catch (e) {
    console.error("Error determining redirect URI:", e);
    // Fallback
    return 'http://localhost:9900/';
  }
};

/**
 * Check if the app is running in an iframe
 */
export const isInIframe = (): boolean => {
  try {
    return window !== window.parent;
  } catch (e) {
    // If we can't access parent due to cross-origin issues, we're in an iframe
    return true;
  }
};

/**
 * Get cache location settings based on environment
 */
export const getCacheSettings = () => {
  return {
    cacheLocation: "sessionStorage" as "sessionStorage" | "localStorage",
    storeAuthStateInCookie: isInIframe(),
  };
};

/**
 * Get MSAL logger options
 */
export const getLoggerOptions = () => {
  return {
    loggerCallback: (level: number, message: string, containsPii: boolean) => {
      if (containsPii) {
        return;
      }
      switch (level) {
        case 0: // Error
          console.error(`[MSAL] ${message}`);
          break;
        case 1: // Warning
          console.warn(`[MSAL] ${message}`);
          break;
        case 2: // Info
          console.info(`[MSAL] ${message}`);
          break;
        case 3: // Verbose
          console.debug(`[MSAL] ${message}`);
          break;
      }
    },
    piiLoggingEnabled: false,
    logLevel: 2, // Info level by default
  };
};

/**
 * Create the MSAL configuration
 */
export const createMsalConfig = (
  signInPolicy: string,
  clientId: string = tenantConfig.clientId
): Configuration => {
  // Get the redirect URI - log for debugging
  const redirectUri = getRedirectUri();
  console.log("[msalConfig] Configured redirectUri:", redirectUri);

  return {
    auth: {
      clientId,
      authority: `https://${tenantConfig.authorityDomain}/${tenantConfig.domain}/${signInPolicy}/v2.0`,
      knownAuthorities: [`${tenantConfig.authorityDomain}`],
      redirectUri,
      postLogoutRedirectUri: redirectUri,
      navigateToLoginRequestUrl: true,
    },
    cache: getCacheSettings(),
    system: {
      allowRedirectInIframe: true, // Enable for Lucidchart environment
      loggerOptions: getLoggerOptions(),
      windowHashTimeout: 60000, // Time to wait for hash change (ms)
      iframeHashTimeout: 6000, // Time to wait for iframe hash change (ms)
      loadFrameTimeout: 6000, // Time to wait for iframe load (ms)
    },
  };
};
