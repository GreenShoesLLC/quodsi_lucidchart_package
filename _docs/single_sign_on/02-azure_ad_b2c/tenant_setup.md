# Azure AD B2C Tenant Setup

This guide provides detailed instructions for creating and configuring an Azure AD B2C tenant for Quodsi's SSO implementation with subscription management.

## Overview

Azure AD B2C serves as the identity provider for Quodsi, handling user authentication and profile management. The B2C tenant needs to be configured to work within the LucidChart iframe environment and to store subscription-related user attributes.

## Prerequisites

- Azure subscription with administrative access
- Global administrator privileges
- Domain name for the B2C tenant (optional, but recommended)

## Step 1: Create the Azure AD B2C Tenant

1. Sign in to the [Azure Portal](https://portal.azure.com)

2. Select **Create a resource** and search for **Azure Active Directory B2C**

3. Click **Create** and select **Create a new Azure AD B2C Tenant**

4. Fill in the required information:
   - **Organization name**: `Quodsi`
   - **Initial domain name**: `quodsi` (will result in `quodsi.onmicrosoft.com`)
   - **Country/Region**: Select your primary region
   - **Subscription**: Select your Azure subscription

5. Click **Review + create**, then **Create**

6. Once creation is complete (typically takes 1-2 minutes), you'll see a notification. Click on **Go to resource** or find your new B2C tenant by searching for "Azure AD B2C" in the Azure Portal

## Step 2: Link the B2C Tenant to Your Subscription

1. In the Azure Portal, switch to your new B2C tenant by clicking on your account in the top-right corner, then **Switch directory**

2. Select your new B2C tenant from the list

3. In the new B2C tenant, select **Azure AD B2C** from the services list

4. In the B2C tenant admin portal, select **Resource providers** from the left navigation

5. Click **+ Register** to link the B2C tenant to your Azure subscription:
   - Select your Azure subscription
   - Click **Register**

## Step 3: Configure Custom Domain (Optional but Recommended)

For production environments, a custom domain enhances professionalism and trust:

1. In your B2C tenant, navigate to **Custom domain names**

2. Click **+ Add custom domain**

3. Enter your domain (e.g., `auth.quodsi.com`)

4. Add the required DNS records to your domain provider:
   - Record type: TXT
   - Host: @
   - Value: (provided by Azure)

5. After DNS verification, set the domain as primary if desired

## Step 4: Configure User Attributes

We need to configure the B2C directory to store subscription-related information:

1. In your B2C tenant, navigate to **User attributes**

2. Click **+ Add** to create custom attributes for subscription information:
   - Add attribute `subscriptionId` (String)
   - Add attribute `subscriptionStatus` (String)
   - Add attribute `subscriptionTier` (String)
   - Add attribute `subscriptionExpiryDate` (DateTime)

These attributes will be updated through the Quodsi backend API when subscription events occur in Stripe.

## Step 5: Configure External Identity Providers (Optional)

For enhanced user experience, configure social identity providers:

1. Navigate to **Identity providers**

2. Add providers as needed:
   - Microsoft Account
   - Google
   - Facebook
   - GitHub
   - Custom OpenID Connect providers

3. Configure each provider with the appropriate client ID and secret

## Step 6: Configure Password Complexity

1. Navigate to **Password complexity**

2. Set appropriate password requirements:
   - Minimum length: 8 characters (recommended)
   - Required character types: Uppercase, lowercase, numbers, symbols
   - Maximum invalid sign-in attempts: 5 (recommended)

## Step 7: Configure Company Branding

1. Navigate to **Company branding**

2. Configure the sign-in page appearance:
   - Upload the Quodsi logo
   - Set banner image
   - Configure background color to match Quodsi brand
   - Add appropriate sign-in page text

## Step 8: Configure CORS for LucidChart Integration

For the iframe-based authentication in LucidChart to work correctly, configure Cross-Origin Resource Sharing (CORS):

1. Navigate to **Authentication** > **CORS configuration**

2. Add the following origins:
   - `https://lucid.app`
   - `https://app.lucid.co`
   - `https://chart.lucid.app`
   - Your development domain(s)

3. Enable **Access-Control-Allow-Credentials** for these origins

## Step 9: Configure Token Lifetime

Configure appropriate token lifetimes for the application:

1. Navigate to **Token lifetimes**

2. Configure the following settings:
   - Access token lifetime: 1 hour (recommended)
   - Refresh token lifetime: 14 days (can be adjusted based on security requirements)
   - ID token lifetime: 1 hour

## Step 10: Create API Connector for Subscription Validation (Optional)

For real-time subscription checks during authentication:

1. Navigate to **API connectors**

2. Create a new API connector for the "Before user sign-in" step
   - Name: "Subscription Validation"
   - Endpoint URL: `https://api.quodsi.com/auth/validate-subscription`
   - Authentication: Basic or Certificate-based (as per your security requirements)

3. Configure the connector to send user identifier information

This connector allows checking subscription status during the authentication process, potentially blocking sign-in for accounts with invalid subscriptions.

## Step 11: Configure Fraud Protection (Recommended for Production)

For production environments, enable fraud protection:

1. Navigate to **Fraud protection**

2. Enable IP-based tracking and blocking
   - Configure allowed countries/regions
   - Configure suspicious IP blocking
   - Set up risk-based authentication challenges

## Step 12: Configure App Registrations for Quodsi

You'll need to register two applications within your B2C tenant:

1. **Quodsi React SPA**:
   - Navigate to **App registrations**
   - Click **+ New registration**
   - Name: `Quodsi React SPA`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `SPA` and your redirect URI (e.g., `https://app.quodsi.com/auth-callback`)
   - Click **Register**

2. **Quodsi Backend API**:
   - Navigate to **App registrations**
   - Click **+ New registration**
   - Name: `Quodsi Backend API`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: (leave blank)
   - Click **Register**
   - Navigate to **Expose an API**
   - Set the Application ID URI
   - Add scopes (e.g., `Quodsi.Read`, `Quodsi.Write`)

For each application, note the Application (client) ID and tenant ID, as you'll need these for configuration.

## Step 13: Configure Authentication for SPA

For the Quodsi React SPA app:

1. Navigate to **Authentication**

2. Ensure the platform is set to **SPA**

3. Under **Implicit grant and hybrid flows**:
   - Check **ID tokens (used for implicit and hybrid flows)**
   - Uncheck **Access tokens**

4. Under **Advanced settings**:
   - Set **Allow public client flows** to **Yes**
   - Set **Treat application as a public client** to **Yes**

5. Click **Save**

## Step 14: Test Your B2C Tenant

Before proceeding with full integration:

1. Create a test user in your B2C tenant
2. Try signing in with the test user
3. Verify custom attributes are accessible
4. Test the basic authentication flow

## Next Steps

After completing the Azure AD B2C tenant setup:

1. Configure [user flows](./user_flows.md) for sign-up/sign-in and password reset
2. Complete [application registration](./application_registration.md) details
3. Set up [custom user attributes](./custom_user_attributes.md) for subscription management
4. Configure [CORS settings](./cors_configuration.md) for LucidChart integration

## Troubleshooting

### Common Issues

- **Tenant Creation Fails**: Verify you have the necessary Azure subscription permissions
- **DNS Verification Fails**: Check your DNS provider settings and wait for propagation (can take up to 48 hours)
- **Social Identity Provider Configuration Issues**: Verify client IDs and secrets, and ensure redirect URIs are properly configured

### Support Resources

- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)
- [Azure Support](https://azure.microsoft.com/en-us/support/options/)
