# CORS Configuration for LucidChart Integration

This document provides detailed instructions for configuring Cross-Origin Resource Sharing (CORS) settings in Azure AD B2C to support authentication within the LucidChart iframe environment.

## Overview

Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page. Since Quodsi runs inside a LucidChart iframe, proper CORS configuration is critical for authentication to work correctly.

## Prerequisites

- Azure AD B2C tenant created and configured
- User flows created (sign-up/sign-in, password reset)
- Application registrations completed
- Global administrator access to the B2C tenant

## Understanding the CORS Challenge

In the Quodsi architecture, several cross-origin scenarios occur:

1. The Quodsi React app is loaded in an iframe from LucidChart (`lucid.app` or `chart.lucid.app`)
2. The React app communicates with Azure AD B2C for authentication
3. The React app communicates with the Quodsi backend API for data
4. The React app communicates with the parent LucidChart frame

Each of these cross-origin interactions needs proper configuration.

## Step 1: Configure CORS in Azure AD B2C

### Configure Reply URLs and CORS settings

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **App registrations**

3. Select your React SPA application

4. Go to **Authentication**

5. Under **Platform configurations**, ensure your SPA has the correct redirect URIs:
   - Your application's domain, e.g., `https://app.quodsi.com/auth-callback`
   - Your development domain, e.g., `http://localhost:3000/auth-callback`
   - LucidChart domains: `https://lucid.app/auth-callback`, `https://chart.lucid.app/auth-callback`

6. Under the B2C tenant settings, navigate to **Security** > **CORS configuration**

7. Add the following origins:
   ```
   https://lucid.app
   https://chart.lucid.app
   https://app.lucid.co
   https://app.quodsi.com
   http://localhost:3000
   ```

8. Enable **Access-Control-Allow-Credentials** for these origins

9. Click **Save**

## Step 2: Configure Content Security Policy in User Flows

To allow the authentication pages to be embedded in iframes:

1. Navigate to **User flows**

2. Select your sign-up and sign-in flow (e.g., `B2C_1_SUSI`)

3. Select **Page layouts** > **Page layout version** > **[Default]**

4. For each page (sign-up, sign-in), add the following JavaScript:

   ```javascript
   // Allow iframe embedding from LucidChart
   content.append('<meta http-equiv="Content-Security-Policy" content="frame-ancestors https://lucid.app https://*.lucid.app;">');
   // Remove X-Frame-Options header that might block iframes
   content.append('<meta name="X-Frame-Options" content="ALLOW-FROM https://lucid.app">');
   ```

5. Click **Save**

6. Repeat for password reset and profile editing flows if applicable

## Step 3: Configure Backend API CORS Settings

Configure CORS for your Azure Functions backend API:

1. Navigate to your Azure Function App in the Azure Portal

2. Select **CORS** under **API**

3. Add the following origins:
   ```
   https://lucid.app
   https://chart.lucid.app
   https://app.lucid.co
   https://app.quodsi.com
   http://localhost:3000
   ```

4. Check **Enable Access-Control-Allow-Credentials**

5. Under **Allowed Headers**, add:
   ```
   Authorization
   Content-Type
   x-requested-with
   x-ms-client-session-id
   x-ms-client-request-id
   ```

6. Under **Exposed Headers**, add:
   ```
   ETag
   x-ms-request-id
   x-ms-client-request-id
   ```

7. Click **Save**

## Step 4: Configure Local Development CORS Settings

For local development, update your `local.settings.json` file:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
    // Other settings...
  },
  "Host": {
    "CORS": "https://lucid.app,https://chart.lucid.app,https://app.lucid.co,http://localhost:3000",
    "CORSCredentials": true
  }
}
```

## Step 5: Implement Cross-Origin Messaging

Since Quodsi runs in a LucidChart iframe, implement secure cross-origin messaging:

### In the React Application

```typescript
// Secure postMessage communication with LucidChart
function sendMessageToParent(message: any) {
  // Only send to LucidChart domains
  if (window.parent !== window) {
    window.parent.postMessage({
      source: 'quodsi',
      ...message
    }, 'https://lucid.app');
  }
}

// Validate incoming messages
window.addEventListener('message', (event) => {
  // Verify the origin
  if (event.origin !== 'https://lucid.app' && 
      event.origin !== 'https://chart.lucid.app' && 
      event.origin !== 'https://app.lucid.co') {
    console.warn('Received message from untrusted origin:', event.origin);
    return;
  }
  
  // Process the message
  const message = event.data;
  if (message && message.source === 'lucidchart') {
    // Handle message from LucidChart
    handleLucidChartMessage(message);
  }
});
```

### In the LucidChart Extension

```typescript
// Send message to the React app in the iframe
quodsiPanel.sendMessage({
  source: 'lucidchart',
  type: 'INIT',
  data: {
    // Panel initialization data
  }
});

// Receive messages from the React app
quodsiPanel.onMessage((message) => {
  if (message && message.source === 'quodsi') {
    // Handle message from Quodsi React app
    handleQuodsiMessage(message);
  }
});
```

## Step 6: Configure Popup Authentication for Iframe Environment

To avoid issues with iframe-based redirects, configure MSAL.js to use popup authentication:

```typescript
const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID",
    authority: "https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/B2C_1_SUSI",
    knownAuthorities: ["YOUR_TENANT.b2clogin.com"],
    redirectUri: "https://app.quodsi.com/auth-callback",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true // For IE11/cross-site scenarios
  },
  system: {
    allowRedirectInIframe: true, // Only if absolutely necessary
    iframeHashTimeout: 10000     // Longer timeout for iframe scenarios
  }
};

// Use popup login instead of redirect
function login() {
  msalInstance.loginPopup()
    .then(handleResponse)
    .catch(error => {
      console.error("Login failed:", error);
    });
}
```

## Step 7: Test CORS Configuration

Test the CORS configuration to ensure proper functionality:

1. **B2C Authentication Test**:
   - Create a simple HTML page with an iframe pointing to your B2C login page
   - Verify the login page loads correctly in the iframe
   - Complete the authentication process
   - Verify the redirect back to your application works

2. **API Access Test**:
   - After authentication, make an API call from your application
   - Check browser developer tools for CORS errors
   - Verify the API response is received correctly

3. **Cross-Origin Messaging Test**:
   - Create a test message from your React app to LucidChart
   - Create a test message from LucidChart to your React app
   - Verify both messages are received correctly

## Troubleshooting CORS Issues

### Common CORS Issues

- **X-Frame-Options Blocking**: If authentication pages don't load in the iframe, check for X-Frame-Options headers
- **Missing Origins**: If API calls fail, verify the correct origins are in the CORS configuration
- **Credentials Issues**: If cookies/tokens aren't included in requests, verify the credentials flag is enabled
- **Redirect Problems**: If authentication redirects break the iframe, use popup authentication instead

### Debugging Steps

1. Use browser developer tools to inspect network requests and check for CORS errors
2. Look for errors in the browser console
3. Use tools like [CORS Debugger](https://cors-debug.github.io/) to test your CORS configuration
4. Verify all origins are correctly spelled and include the proper protocol (http/https)

## Browser-Specific Considerations

Some browsers have stricter CORS and iframe policies:

- **Chrome**: Implements strict CORS checks; verify all headers are correct
- **Safari**: Has stricter iframe cookie policies; test thoroughly
- **Firefox**: Generally more permissive with CORS but still enforces security policies
- **Edge**: Similar to Chrome but may have different behavior with cookies

## Next Steps

After configuring CORS for LucidChart integration:

1. Implement [MSAL.js in the React application](../04-react_implementation/msal_integration.md)
2. Set up [iframe communication](../04-react_implementation/iframe_communication.md)
3. Configure [token validation](../05-backend_implementation/token_validation.md) in the backend API
