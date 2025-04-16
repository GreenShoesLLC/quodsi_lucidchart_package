# Azure AD B2C Application Registration

This document provides detailed instructions for registering and configuring the applications in Azure AD B2C needed for Quodsi's SSO implementation. You'll need to register both the frontend (React SPA) and backend (API) applications.

## Overview

Azure AD B2C requires application registrations to establish the identity and permissions for each component of your system. For Quodsi, we need to register:

1. **Quodsi React Application**: The Single-Page Application (SPA) running in the LucidChart iframe
2. **Quodsi Backend API**: The Azure Functions API that validates tokens and manages user data

## Prerequisites

- Azure AD B2C tenant created and configured
- User flows created (sign-up/sign-in, password reset)
- Global administrator access to the B2C tenant

## Step 1: Register the React SPA Application

### 1.1 Create the Application Registration

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **App registrations**

3. Click **+ New registration**

4. Enter application information:
   - **Name**: `Quodsi React SPA`
   - **Supported account types**: `Accounts in this organizational directory only (Quodsi only - Single tenant)`
   - **Redirect URI**: Select platform **Single-page application (SPA)** and enter your redirect URI, e.g. `https://app.quodsi.com/auth-callback` (for development, you might use `http://localhost:3000/auth-callback`)
   - For LucidChart compatibility, add an additional redirect URI: `https://lucid.app/auth-callback`

5. Click **Register**

6. Note the **Application (client) ID** and **Directory (tenant) ID** for later configuration

### 1.2 Configure Authentication Settings

1. Select **Authentication** from the left menu

2. Under **Implicit grant and hybrid flows**:
   - Check **ID tokens (used for implicit and hybrid flows)**
   - Ensure **Access tokens** is NOT checked (we'll use PKCE instead)

3. Under **Advanced settings**:
   - Set **Allow public client flows** to **Yes**
   - Set **Treat application as a public client** to **Yes**

4. Configure **Front-channel logout URL**: `https://app.quodsi.com/logout` (or your development equivalent)

5. Under **Supported account types**:
   - Verify it's set to **My organization only**

6. Click **Save**

### 1.3 Configure API Permissions

1. Select **API permissions** from the left menu

2. Click **+ Add a permission**

3. Select **My APIs** and choose the Quodsi Backend API (you'll register this next)

4. Select the following permissions:
   - `Quodsi.Read`
   - `Quodsi.Write`
   - (Add other custom scopes as needed)

5. Click **Add permissions**

6. Click **Grant admin consent for [tenant name]** to pre-authorize these permissions

### 1.4 Configure Application Manifest

Update the application manifest to ensure compatibility with iframe environment:

1. Select **Manifest** from the left menu

2. Find the `accessTokenAcceptedVersion` property and set its value to `2`

3. Update `replyUrlsWithType` to include all your redirect URIs with type "spa"

4. Ensure `oauth2AllowImplicitFlow` is set to `false`

5. Ensure `oauth2AllowIdTokenImplicitFlow` is set to `true`

6. Click **Save**

## Step 2: Register the Backend API Application

### 2.1 Create the Application Registration

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **App registrations**

3. Click **+ New registration**

4. Enter application information:
   - **Name**: `Quodsi Backend API`
   - **Supported account types**: `Accounts in this organizational directory only (Quodsi only - Single tenant)`
   - **Redirect URI**: Leave blank (not needed for the API)

5. Click **Register**

6. Note the **Application (client) ID** and **Directory (tenant) ID** for later configuration

### 2.2 Configure the API

1. Select **Expose an API** from the left menu

2. Set the **Application ID URI**: Click **Set**, then either accept the default (recommended) or use a custom URI like `https://quodsi.onmicrosoft.com/api`

3. Click **+ Add a scope** to define permissions your API will expose:

   a. For Read access:
      - **Scope name**: `Quodsi.Read`
      - **Admin consent display name**: `Read Access`
      - **Admin consent description**: `Allows reading user data and simulations`
      - Set **State** to **Enabled**
      - Click **Add scope**

   b. For Write access:
      - **Scope name**: `Quodsi.Write`
      - **Admin consent display name**: `Write Access`
      - **Admin consent description**: `Allows creating and modifying user data and simulations`
      - Set **State** to **Enabled**
      - Click **Add scope**

   c. Add additional scopes as needed for your application

4. (Optional) Add **Client applications** that are pre-authorized to request these permissions:
   - Click **+ Add a client application**
   - Enter the **Application (client) ID** of your Quodsi React SPA
   - Select the scopes to pre-authorize
   - Click **Add application**

### 2.3 Configure Authentication Settings

1. Select **Authentication** from the left menu

2. Under **Advanced settings**:
   - Set **Allow public client flows** to **No**

3. Click **Save**

### 2.4 Configure Application Manifest

1. Select **Manifest** from the left menu

2. Find the `accessTokenAcceptedVersion` property and set its value to `2`

3. Click **Save**

## Step 3: Configure App Roles (Optional)

For role-based access control:

1. Select **App roles** from the left menu of your Backend API

2. Click **+ Create app role**

3. Configure roles as needed, for example:
   - **Display name**: `Administrator`
   - **Allowed member types**: Select both `Users/Groups` and `Applications`
   - **Value**: `Admin`
   - **Description**: `Administrators have full access to all features`
   - Check **Do you want to enable this app role?**
   - Click **Apply**

4. Create additional roles as needed for your application

## Step 4: Configure Authentication for Iframe Environment

To ensure the authentication works properly in LucidChart's iframe environment:

1. For the React SPA application, go to **Authentication**

2. Under **SPA configuration**, ensure all your redirect URIs are correctly entered

3. Under **Implicit grant and hybrid flows**, ensure **ID tokens** is selected

4. Under **Advanced settings**:
   - Verify that **Front-channel logout URL** is configured correctly
   - Set **Enable the following mobile and desktop flows** to **Yes**

5. Click **Save**

## Step 5: Configure API Client Secret

For the Backend API to authenticate as itself:

1. Select **Certificates & secrets** from the left menu of your Backend API

2. Under **Client secrets**, click **+ New client secret**

3. Enter a description and select an expiration period (24 months recommended for production)

4. Click **Add**

5. **IMPORTANT**: Copy and securely store the client secret value immediately. You won't be able to retrieve it later

## Step 6: Configure User Assignment (Optional)

If you want to restrict access to specific users:

1. Go to **Enterprise applications** in your B2C tenant

2. Find your application in the list

3. Select **Users and groups** from the left menu

4. Click **+ Add user/group**

5. Select users or groups to assign to the application

6. Click **Assign**

## Step 7: Configure Application Authentication Parameters for User Flows

1. Go to **User flows** in your B2C tenant

2. Select your Sign-up and sign-in flow

3. Click **Application claims**

4. Select **Run user flow**

5. Under **Select application**, choose your React SPA

6. Set **Reply URL** to one of your authorized redirect URIs

7. Click **Run user flow** to test the authentication

## Step 8: Test Application Registration

Test your application registrations:

1. Create a simple test page that initiates authentication with your B2C tenant using the React SPA's client ID

2. Test successfully acquiring an ID token

3. Use the ID token to call your Backend API

4. Verify the Backend API correctly validates the token

## Configure App Security (Production)

For production deployments, enhance security:

1. Configure **Conditional Access** policies:
   - Navigate to **Security** > **Conditional Access**
   - Create policies for:
     - Requiring MFA for sensitive operations
     - Blocking suspicious sign-in attempts
     - Restricting access based on location

2. Configure **Token lifetime** policies:
   - For higher security, reduce token lifetimes
   - For better user experience, consider appropriate refresh token lifetimes

## Application Settings for Development

For your development environment, use these settings:

### React Application Configuration

```typescript
// src/auth/authConfig.ts
export const msalConfig = {
  auth: {
    clientId: "YOUR_SPA_CLIENT_ID",
    authority: "https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/B2C_1_SUSI",
    knownAuthorities: ["YOUR_TENANT.b2clogin.com"],
    redirectUri: "http://localhost:3000/auth-callback",
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true
  },
  system: {
    allowRedirectInIframe: true,    // Important for LucidChart iframe
    iframeHashTimeout: 10000        // Increase timeout for iframe scenarios
  }
};
```

### Backend API Configuration

```javascript
// Azure Function configuration
module.exports = {
  auth: {
    // Azure AD B2C domain
    domain: 'your-tenant.b2clogin.com',
    
    // Your tenant name
    tenantName: 'your-tenant',
    
    // The policy name (user flow) to use
    policyName: 'B2C_1_SUSI',
    
    // Audience (The Application ID URI of your API)
    audience: 'https://your-tenant.onmicrosoft.com/api',
    
    // Required scopes for the API
    requiredScopes: ['Quodsi.Read', 'Quodsi.Write'],
    
    // The issuer for validation
    get issuer() {
      return `https://${this.domain}/${this.tenantName}.onmicrosoft.com/${this.policyName}/v2.0/`;
    },
    
    // JWKS URI for fetching signing keys
    get jwksUri() {
      return `https://${this.domain}/${this.tenantName}.onmicrosoft.com/${this.policyName}/discovery/v2.0/keys`;
    }
  }
};
```

## Next Steps

After completing the application registration:

1. Configure [custom user attributes](./custom_user_attributes.md) for subscription management
2. Set up [CORS configuration](./cors_configuration.md) for LucidChart integration
3. Implement MSAL.js in the [React application](../04-react_implementation/msal_integration.md)
4. Configure token validation in the [backend API](../05-backend_implementation/token_validation.md)
