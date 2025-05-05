/**
 * Configuration file for MSAL authentication in the new messaging system
 */

// Get the current host for dynamic redirect URI configuration
const getRedirectUri = (): string => {
  try {
    const currentUrl = window.location.href;
    
    // When running in Lucidchart's development environment
    if (currentUrl.includes('localhost:9900')) {
      // Use the full path exactly as it appears
      return 'http://localhost:9900/resources/quodsim-react/index.html';
    }
    
    // When running in Lucidchart production
    if (currentUrl.includes('lucid.app') || currentUrl.includes('lucidchart.com')) {
      // For production, we'd need to register the actual path
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

// B2C tenant name and policies
const tenantName = 'quodsidevb2c';
const tenantDomain = `${tenantName}.onmicrosoft.com`;
const authorityDomain = `${tenantName}.b2clogin.com`;

// Policy (user flow) names
export const b2cPolicies = {
  authorities: {
    signUpSignIn: {
      name: "B2C_1_SignUpSignIn_EmailOnly_Dev",
      authority: `https://${authorityDomain}/${tenantDomain}/B2C_1_SignUpSignIn_EmailOnly_Dev/v2.0`,
      knownAuthorities: [`${authorityDomain}`]
    },
    passwordReset: {
      name: "B2C_1_PasswordReset_EmailOnly_Dev",
      authority: `https://${authorityDomain}/${tenantDomain}/B2C_1_PasswordReset_EmailOnly_Dev/v2.0`,
      knownAuthorities: [`${authorityDomain}`]
    },
    editProfile: {
      name: "B2C_1_ProfileEdit_Dev",
      authority: `https://${authorityDomain}/${tenantDomain}/B2C_1_ProfileEdit_Dev/v2.0`,
      knownAuthorities: [`${authorityDomain}`]
    }
  }
};

// Check if the app is running in an iframe (like in Lucidchart)
const isInIframe = (): boolean => {
  try {
    return window !== window.parent;
  } catch (e) {
    // If we can't access parent due to cross-origin issues, we're in an iframe
    return true;
  }
};

// Get the redirect URI - make this explicit for debugging
const redirectUri = getRedirectUri();
console.log("MSAL RedirectUri:", redirectUri);

// Authentication request configuration
export const loginRequest = {
  scopes: [
    "https://quodsidevb2c.onmicrosoft.com/api/Data.Read",
    "https://quodsidevb2c.onmicrosoft.com/api/Data.Write",
    "https://quodsidevb2c.onmicrosoft.com/api/Simulation.Run"
  ],
  prompt: "login" // Force login prompt to avoid cached sessions
};

// MSAL configuration
export const msalConfig = {
  auth: {
    clientId: "71597220-4889-4c06-8c08-152dfae2082b", // Azure AD B2C Frontend App client ID
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: b2cPolicies.authorities.signUpSignIn.knownAuthorities,
    redirectUri: redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: isInIframe() // Set to true for iframe environments
  },
  system: {
    allowRedirectInIframe: true, // Enable for Lucidchart environment
    loggerOptions: {
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
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 6000
  }
};