// src/hooks/handleExternalLogin.ts
import { msalConfig } from './authConfig';

/**
 * Determines the appropriate redirect URI based on the current environment
 */
function getRedirectUriForEnvironment(): string {
    try {
        const currentUrl = window.location.href;
        const url = new URL(currentUrl);

        // For Lucidchart development environment at localhost:9900
        // Important: This must exactly match one of the values registered in Azure B2C
        if (url.origin.includes('localhost:9900')) {
            return 'http://localhost:9900/';  // Match Azure B2C configuration
        }

        // For Lucidchart production
        if (currentUrl.includes('lucid.app') || currentUrl.includes('lucidchart.com')) {
            // This would need to be registered in Azure B2C for production
            return 'https://app.lucid.co/';  // Example - update to match your Azure registration
        }

        // For local React development
        return 'http://localhost:3000/';  // Match Azure B2C configuration
    } catch (e) {
        console.error("Error determining redirect URI:", e);
        // Fallback to a known registered value
        return 'http://localhost:9900/';
    }
}

/**
 * Creates a URL for external login with Azure B2C
 * @param redirectUri Optional override for the redirect URI
 * @returns The full login URL to open in a popup window
 */
export function createExternalLoginUrl(redirectUri?: string): string {
    // Get the correct redirect URI
    const finalRedirectUri = redirectUri || getRedirectUriForEnvironment();

    // B2C configuration
    const authorityUrl = msalConfig.auth.authority;
    const clientId = msalConfig.auth.clientId;

    // Default scopes
    const scopes = [
        "https://quodsidevb2c.onmicrosoft.com/api/Data.Read",
        "https://quodsidevb2c.onmicrosoft.com/api/Data.Write",
        "https://quodsidevb2c.onmicrosoft.com/api/Simulation.Run"
    ];

    // Generate state and nonce for security
    const state = btoa(JSON.stringify({
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2)
    }));
    const nonce = Math.random().toString(36).substring(2);

    // Build the URL
    const loginUrl = `${authorityUrl}/oauth2/v2.0/authorize` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(finalRedirectUri)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&state=${encodeURIComponent(state)}` +
        `&nonce=${encodeURIComponent(nonce)}` +
        `&prompt=login`; // Force login prompt

    return loginUrl;
}

/**
 * Opens the login window and sets up message listener for the result
 * @returns Promise that resolves with the auth result or rejects with an error
 */
export function openExternalLoginWindow(): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            // Create login URL
            const loginUrl = createExternalLoginUrl();
            console.log("Opening external login with URL:", loginUrl);

            // Open the login window
            const loginWindow = window.open(loginUrl, '_blank', 'width=800,height=600');

            if (!loginWindow) {
                throw new Error("Login popup was blocked. Please allow popups for this site.");
            }

            // Set up timeout to reject the promise after 5 minutes
            const timeoutId = setTimeout(() => {
                removeListener();
                reject(new Error("Login timed out after 5 minutes."));
            }, 5 * 60 * 1000);

            // Set up message listener for the auth callback
            const handleMessage = (event: MessageEvent) => {
                try {
                    const data = event.data;

                    // Check if this is a message from our auth callback
                    if (data && data.type === 'QUODSI_AUTH_COMPLETE') {
                        console.log("Received auth complete message");

                        // Clean up
                        clearTimeout(timeoutId);
                        removeListener();

                        if (loginWindow && !loginWindow.closed) {
                            loginWindow.close();
                        }

                        // Handle the auth result
                        if (data.hash) {
                            // Parse the hash
                            const params = new URLSearchParams(data.hash.substring(1));
                            const accessToken = params.get('access_token');
                            const idToken = params.get('id_token');
                            const state = params.get('state');
                            const error = params.get('error');
                            const errorDescription = params.get('error_description');

                            if (error) {
                                reject(new Error(`Auth error: ${error} - ${errorDescription || 'Unknown error'}`));
                            } else if (accessToken) {
                                resolve({
                                    accessToken,
                                    idToken,
                                    state
                                });
                            } else {
                                reject(new Error("No access token found in response"));
                            }
                        } else {
                            reject(new Error("Invalid auth response"));
                        }
                    }
                } catch (error) {
                    console.error("Error processing auth message:", error);
                    reject(error);
                }
            };

            // Add the event listener
            window.addEventListener('message', handleMessage);

            // Function to remove the listener
            const removeListener = () => {
                window.removeEventListener('message', handleMessage);
            };

            // Check for auth result in localStorage as fallback
            const checkLocalStorage = () => {
                try {
                    const storedResult = localStorage.getItem('quodsi_auth_result');
                    if (storedResult) {
                        const result = JSON.parse(storedResult);
                        if (result.hash) {
                            console.log("Found auth result in localStorage");
                            // Clear it
                            localStorage.removeItem('quodsi_auth_result');

                            // Process it
                            const params = new URLSearchParams(result.hash.substring(1));
                            const accessToken = params.get('access_token');
                            if (accessToken) {
                                clearTimeout(timeoutId);
                                removeListener();
                                resolve({
                                    accessToken,
                                    idToken: params.get('id_token'),
                                    state: params.get('state')
                                });
                                return true;
                            }
                        }
                    }
                    return false;
                } catch (e) {
                    console.error("Error checking localStorage:", e);
                    return false;
                }
            };

            // Set up an interval to check localStorage as fallback
            const checkInterval = setInterval(() => {
                if (checkLocalStorage()) {
                    clearInterval(checkInterval);
                    if (loginWindow && !loginWindow.closed) {
                        loginWindow.close();
                    }
                }
            }, 1000);

            // Clear the interval after timeout
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 5 * 60 * 1000);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Process external login token and return user info
 */
export function processExternalLoginToken(token: string): any {
    try {
        // For JWT tokens, parse the claims
        if (token.includes('.') && token.split('.').length === 3) {
            const parts = token.split('.');
            const payload = parts[1];

            // Base64 decode and parse
            const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            const claims = JSON.parse(decodedPayload);

            // Extract user info
            return {
                idToken: token,
                username: claims.emails?.[0] || claims.email || claims.preferred_username || 'unknown',
                name: claims.name || claims.given_name || '',
                claims: claims
            };
        }

        // If not a JWT, return minimal info
        return {
            idToken: token,
            username: 'unknown',
            name: 'Unknown User'
        };
    } catch (error) {
        console.error("Error processing external login token:", error);
        throw error;
    }
}