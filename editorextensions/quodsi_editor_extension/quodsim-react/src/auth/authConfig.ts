// src/auth/authConfig.ts

/**
 * Configuration for Microsoft Authentication Library (MSAL)
 * to connect with Azure AD B2C for authentication.
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
    signUpSignIn: "B2C_1_SignUpSignIn_EmailOnly_Dev",
    forgotPassword: "B2C_1_PasswordReset_EmailOnly_Dev",
    editProfile: "B2C_1_ProfileEdit_Dev"
};

// Build the authority URL
const buildAuthority = (policy: string): string => {
    return `https://${authorityDomain}/${tenantDomain}/${policy}/v2.0`;
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

// MSAL configuration
export const msalConfig = {
    auth: {
        clientId: "71597220-4889-4c06-8c08-152dfae2082b", // Azure AD B2C Frontend App client ID
        authority: buildAuthority(b2cPolicies.signUpSignIn),
        knownAuthorities: [`${authorityDomain}`],
        redirectUri: redirectUri, // Use the value we determined
        postLogoutRedirectUri: redirectUri, // Use same URI for logout
        navigateToLoginRequestUrl: true, // Navigate back to the original request
    },
    cache: {
        cacheLocation: "sessionStorage", // "localStorage" is more persistent but less secure
        storeAuthStateInCookie: isInIframe(), // Set to true for iframe environments
    },
    system: {
        allowRedirectInIframe: true, // Enable for Lucidchart environment
        loggerOptions: {
            loggerCallback: (level: any, message: string, containsPii: boolean) => {
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
        windowHashTimeout: 60000, // Time to wait for hash change (ms)
        iframeHashTimeout: 6000, // Time to wait for iframe hash change (ms)
        loadFrameTimeout: 6000, // Time to wait for iframe load (ms)
    },
};

// Helper to create login request with proper authority
export const createLoginRequest = (policy = b2cPolicies.signUpSignIn) => {
    return {
        scopes: [
            "https://quodsidevb2c.onmicrosoft.com/api/Data.Read",
            "https://quodsidevb2c.onmicrosoft.com/api/Data.Write",
            "https://quodsidevb2c.onmicrosoft.com/api/Simulation.Run"
        ],
        authority: buildAuthority(policy),
        prompt: "login" // Force login prompt to avoid cached sessions
    };
};

// Default login request with sign-up/sign-in policy
export const loginRequest = createLoginRequest();

// Reset password request with password reset policy
export const passwordResetRequest = createLoginRequest(b2cPolicies.forgotPassword);

// Edit profile request with profile edit policy
export const profileEditRequest = createLoginRequest(b2cPolicies.editProfile);

// API endpoints configuration
export const apiConfig = {
    baseUrl: process.env.REACT_APP_API_BASE_URL || "https://quodsi-api-dev.azurewebsites.net",
    endpoints: {
        models: "/api/models",
        simulations: "/api/simulations",
        results: "/api/results"
    }
};