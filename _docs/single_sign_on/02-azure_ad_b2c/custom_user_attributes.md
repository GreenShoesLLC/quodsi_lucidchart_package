# Custom User Attributes for Subscription Management

This document provides detailed instructions for configuring custom user attributes in Azure AD B2C to support Quodsi's subscription management functionality.

## Overview

Custom user attributes in Azure AD B2C allow you to store additional information about users beyond the standard profile attributes. For Quodsi's subscription-based access model, we need to store subscription-related information with each user profile.

## Prerequisites

- Azure AD B2C tenant created and configured
- User flows created (sign-up/sign-in, password reset)
- Application registrations completed
- Global administrator access to the B2C tenant

## Required Custom Attributes

For Quodsi's subscription management, we'll create the following custom attributes:

| Attribute Name | Data Type | Description |
|----------------|-----------|-------------|
| `subscriptionId` | String | The Stripe subscription ID |
| `subscriptionStatus` | String | Current status (active, past_due, canceled, etc.) |
| `subscriptionTier` | String | Subscription tier (free, professional, team, enterprise) |
| `subscriptionExpiryDate` | DateTime | When the current subscription period ends |
| `stripeCustomerId` | String | The Stripe customer ID associated with the user |

## Step 1: Create Custom Attributes in B2C

1. In the Azure Portal, go to your B2C tenant

2. Navigate to **User attributes**

3. Click **+ Add** to create the first custom attribute:
   - **Name**: `subscriptionId`
   - **Data Type**: `String`
   - Click **Create**

4. Repeat for each additional attribute:
   - `subscriptionStatus` (String)
   - `subscriptionTier` (String)
   - `subscriptionExpiryDate` (DateTime)
   - `stripeCustomerId` (String)

## Step 2: Incorporate Attributes into User Flows

### Sign-up and Sign-in Flow

1. Navigate to **User flows**

2. Select your sign-up and sign-in flow (e.g., `B2C_1_SUSI`)

3. Select **User attributes** from the left menu

4. Under **Collect attribute**:
   - Do not include subscription attributes as they'll be set by the backend, not during sign-up

5. Under **Return claim**:
   - Add `subscriptionStatus` and `subscriptionTier` to include these in the token
   - Leave other subscription attributes out of tokens for security

6. Click **Save**

### Profile Editing Flow (if applicable)

1. Navigate to **User flows**

2. Select your profile editing flow (e.g., `B2C_1_ProfileEdit`)

3. Select **User attributes** from the left menu

4. Under **Collect attribute**:
   - Do not include any subscription attributes as they should not be editable by users

5. Under **Return claim**:
   - Add `subscriptionStatus` and `subscriptionTier` to include these in the token

6. Click **Save**

## Step 3: Configure API Access to Attributes

For your backend API to read and write these attributes:

1. Navigate to **App registrations**

2. Select your backend API application

3. Go to **API permissions**

4. Click **+ Add a permission**

5. Select **Microsoft Graph** > **Application permissions**

6. Add the following permissions:
   - `User.Read.All`: To read user profiles
   - `User.ReadWrite.All`: To update user profiles

7. Click **Add permissions**

8. Click **Grant admin consent for [tenant name]**

## Step 4: Configure Claims Mapping (Optional)

If you need to customize how attributes appear in tokens:

1. Navigate to **App registrations**

2. Select your React SPA application

3. Go to **Token configuration**

4. Click **+ Add optional claim**

5. Add any standard claims you need

6. For custom claims, note that you need to edit the user flow directly

## Step 5: Schema for Subscription Status Values

Define a standard schema for the subscription status and tier values:

### Subscription Status Values

```json
{
  "subscriptionStatus": {
    "enum": [
      "free",
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired"
    ],
    "description": "Current state of the subscription"
  }
}
```

### Subscription Tier Values

```json
{
  "subscriptionTier": {
    "enum": [
      "free",
      "professional",
      "team",
      "enterprise"
    ],
    "description": "Subscription plan tier"
  }
}
```

## Step 6: Using the Custom Attributes in Your Application

### Reading Attributes in the React App

When using MSAL.js to authenticate, you can access the custom attributes from the ID token:

```typescript
// After successful authentication
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
  const idTokenClaims = accounts[0].idTokenClaims;
  
  // Access subscription information
  const subscriptionStatus = idTokenClaims.subscriptionStatus;
  const subscriptionTier = idTokenClaims.subscriptionTier;
  
  // Use the subscription information to enable/disable features
  if (subscriptionTier === 'professional' || subscriptionTier === 'team' || subscriptionTier === 'enterprise') {
    // Enable premium features
  } else {
    // Restrict to free tier features
  }
}
```

### Updating Attributes in the Backend API

In your backend API, update the attributes when subscription status changes:

```javascript
// After a Stripe webhook event for subscription update
const { MSGraphClient } = require('@azure/ms-graph-client');
const { ClientSecretCredential } = require('@azure/identity');

async function updateUserSubscription(userId, subscriptionData) {
  // Get access token for Microsoft Graph API
  const credential = new ClientSecretCredential(
    process.env.TENANT_ID,
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
  );
  
  // Create Microsoft Graph client
  const graphClient = MSGraphClient.createWithCredential(credential);
  
  // Update user's custom attributes
  await graphClient.api(`/users/${userId}`)
    .update({
      extension_[your-app-id]_subscriptionId: subscriptionData.id,
      extension_[your-app-id]_subscriptionStatus: subscriptionData.status,
      extension_[your-app-id]_subscriptionTier: subscriptionData.tier,
      extension_[your-app-id]_subscriptionExpiryDate: subscriptionData.expiryDate
    });
}
```

Note: Replace `[your-app-id]` with your application's ID in the B2C tenant.

## Step 7: Testing Custom Attributes

Test the custom attributes to ensure they work properly:

1. Create a test user in your B2C tenant
2. Use Graph API to set custom attribute values
3. Have the user sign in and verify the attributes are returned in the token
4. Update the attributes and verify the changes are reflected in subsequent tokens

## Best Practices

### Security Considerations

- Only include necessary subscription information in tokens
- Don't include sensitive details like payment information
- Use appropriate API permissions for accessing user data
- Validate all attribute values when updating them

### Performance Considerations

- Cache subscription status locally when appropriate
- Use the attributes from tokens when possible to reduce API calls
- Keep attribute values small to avoid token size issues

### Maintenance Considerations

- Document the attribute schema for future reference
- Use consistent naming conventions for attributes
- Consider versioning strategy for schema changes

## Troubleshooting

### Common Issues

- **Attributes Not Appearing in Tokens**: Verify they're included as return claims in the user flow
- **Cannot Write Attributes**: Check Graph API permissions and consent
- **Unexpected Attribute Format**: Verify data types and constraints in B2C

### Diagnostic Steps

1. Use the Graph Explorer to view and modify user attributes directly
2. Examine token contents using tools like [jwt.ms](https://jwt.ms)
3. Enable detailed logging in your application

## Next Steps

After configuring custom user attributes:

1. Implement [subscription validation](../05-backend_implementation/subscription_validation.md) in your backend API
2. Configure [webhook handling](../03-stripe_integration/subscription_webhooks.md) for Stripe events
3. Set up [subscription checks](../04-react_implementation/subscription_checks.md) in your React application
