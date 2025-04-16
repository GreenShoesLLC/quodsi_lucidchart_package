# Azure AD B2C User Flows Configuration

This document provides step-by-step instructions for configuring the user flows (policies) required for Quodsi's SSO implementation. User flows define the authentication experiences and data collection for users interacting with your application.

## Overview

Azure AD B2C user flows define the entire user journey for authentication scenarios like sign-up, sign-in, profile editing, and password reset. For Quodsi, we need to configure user flows that work properly within the LucidChart iframe environment and collect the necessary user information.

## Prerequisites

- Azure AD B2C tenant created and configured
- Azure subscription linked to the B2C tenant
- Global administrator access to the B2C tenant

## Required User Flows

For Quodsi's authentication system, we'll create these user flows:

1. **Sign-up and sign-in** (SUSI): Combined flow for new and existing users
2. **Password reset**: Self-service password recovery
3. **Profile editing** (optional): Allows users to update their profile information

## Step 1: Create Sign-up and Sign-in (SUSI) User Flow

This is the primary authentication flow for users signing up or signing in.

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **User flows**

3. Click **+ New user flow**

4. Select **Sign up and sign in**

5. Select **Recommended** version

6. Enter basic information:
   - **Name**: `B2C_1_SUSI` (note: user flow names must begin with "B2C_1_")
   - **Identity providers**: Select "Email signup" for now (we'll add social providers later if needed)

7. Under **User attributes and claims**, configure:
   - **Collect attributes**:
     - Email Address
     - Display Name
     - Given Name
     - Surname
   - **Return claims**:
     - Email Address
     - Display Name
     - Given Name
     - Surname
     - User's Object ID
     - User Principal Name
     - Identity Provider
     - Identity Provider Access Token

8. Add custom attributes:
   - Click **Show more...**
   - Add your previously created custom attributes related to subscription:
     - `subscriptionStatus`
     - `subscriptionTier`

9. Click **Create** to save the user flow

## Step 2: Configure the SUSI User Flow for Iframe Compatibility

The SUSI flow needs special configuration to work in the LucidChart iframe environment:

1. Go to your newly created SUSI user flow

2. Under **Page layouts**, select **Page layouts**

3. Configure page layouts for all pages (sign-up, sign-in, error):
   - Enable **JavaScript enforced layouts**
   - Set **Use JavaScript to match the look and feel of your application** to **Yes**
   - For each page, under **Customizations**, add these settings to the **Page JavaScript** section:
     ```javascript
     // Allow iframe embedding
     content.append('<meta name="X-Frame-Options" content="ALLOW-FROM https://lucid.app">');
     content.append('<meta http-equiv="Content-Security-Policy" content="frame-ancestors https://lucid.app https://*.lucid.app;">');
     ```

4. Under **Content definitions**, configure the content to match your brand:
   - Update heading text, body text, and button labels
   - Customize error message text

5. Save your changes

## Step 3: Create Password Reset User Flow

This flow enables users to reset their password when forgotten.

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **User flows**

3. Click **+ New user flow**

4. Select **Password reset**

5. Select **Recommended** version

6. Enter basic information:
   - **Name**: `B2C_1_PWReset`
   - **Local accounts**: Choose "Reset password using email address"

7. Under **Application claims**, select the claims to include in the token:
   - Email Address
   - User's Object ID
   - Display Name

8. Click **Create** to save the user flow

9. Configure iframe compatibility as in Step 2

## Step 4: Create Profile Editing User Flow (Optional)

This flow allows users to edit their profile information.

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **User flows**

3. Click **+ New user flow**

4. Select **Profile editing**

5. Select **Recommended** version

6. Enter basic information:
   - **Name**: `B2C_1_ProfileEdit`
   - **Identity providers**: Select "Local Account SignIn"

7. Under **User attributes and claims**, configure:
   - **Collect attributes**:
     - Display Name
     - Given Name
     - Surname
   - **Return claims**:
     - Display Name
     - Given Name
     - Surname
     - User's Object ID

8. Click **Create** to save the user flow

9. Configure iframe compatibility as in Step 2

## Step 5: Configure Email Templates

Customize the email templates for verification and password reset:

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **Email templates**

3. Configure **Verification Email**:
   - Email subject: "Verify your Quodsi account"
   - Email body: Customize with Quodsi branding and clear instructions
   - From email address: Configure valid sender address

4. Configure **Password Reset Email**:
   - Email subject: "Reset your Quodsi password"
   - Email body: Customize with Quodsi branding and clear instructions
   - From email address: Same as verification email

5. Save your changes

## Step 6: Configure Multi-Factor Authentication (Optional, Recommended for Production)

For additional security in production environments:

1. Go to your SUSI user flow

2. Select **Properties**

3. Configure **Multi-factor authentication**:
   - Set **MFA enforcement** to **Conditional**
   - Configure the conditions for requiring MFA (e.g., unfamiliar locations, risky sign-ins)

4. Save your changes

## Step 7: Configure API Connector Integration (Optional)

If you want to validate subscription status during authentication:

1. Go to your SUSI user flow

2. Select **API connectors**

3. Configure when to call the API:
   - **Before sign-in**: To block sign-in for invalid subscriptions
   - **After sign-in**: To update subscription info after successful authentication

4. Select the API connector created during tenant setup

5. Save your changes

## Step 8: Test User Flows

Test each user flow to ensure proper functionality:

1. Go to each user flow (SUSI, Password Reset, Profile Editing)

2. Click **Run user flow**

3. Configure the application and reply URL (typically your development environment URL)

4. Click **Run user flow** and verify:
   - The flow works as expected
   - The correct claims are returned
   - The experience is properly branded

5. Check that the flow works within an iframe by creating a simple test page with an iframe pointing to the user flow

## Advanced Configuration Options

### Customized JavaScript for LucidChart Integration

For seamless integration with LucidChart, add this JavaScript to your page layouts:

```javascript
// Enable communication with parent frame (LucidChart)
window.addEventListener('message', function(event) {
  if (event.origin === 'https://lucid.app') {
    // Handle messages from LucidChart
    if (event.data && event.data.type === 'AUTH_REQUEST') {
      // Custom logic for handling auth requests from LucidChart
    }
  }
});

// Notify parent frame when authentication completes
function notifyAuthComplete(success, error) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'AUTH_COMPLETE',
      success: success,
      error: error
    }, 'https://lucid.app');
  }
}
```

### Custom Error Handling

Configure custom error handling by modifying the JavaScript for error pages:

```javascript
// Custom error handling logic
if (OAUTH_ERROR) {
  // Parse error
  const errorCode = OAUTH_ERROR.error;
  const errorDescription = OAUTH_ERROR.error_description;
  
  // Log error (to parent frame if in iframe)
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'AUTH_ERROR',
      error: errorCode,
      description: errorDescription
    }, 'https://lucid.app');
  }
  
  // Custom error UI based on error type
  if (errorCode === 'access_denied') {
    // Handle user cancellation
  } else if (errorCode === 'temporarily_unavailable') {
    // Handle service unavailability
  }
}
```

## Troubleshooting

### Common Issues

- **Iframe Restrictions**: If authentication doesn't work in an iframe, verify the Content Security Policy and X-Frame-Options settings
- **Missing Claims**: If expected claims aren't returned, check the user flow configuration
- **Customization Not Appearing**: Clear browser cache and verify you're editing the correct page layout version

### Debug Mode

Enable debug mode in your application to troubleshoot authentication issues:

```javascript
// In your MSAL configuration
const msalConfig = {
  auth: {
    // Other settings
    clientId: "your-client-id",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii) console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose,
    }
  }
};
```

## Next Steps

After configuring your user flows:

1. Complete [application registration](./application_registration.md) details
2. Configure [custom user attributes](./custom_user_attributes.md) for subscription management
3. Implement the authentication flow in the [React application](../04-react_implementation/msal_integration.md)
