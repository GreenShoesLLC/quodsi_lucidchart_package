# Stripe Setup for Quodsi Subscription Management

This document provides step-by-step instructions for setting up Stripe to handle subscription management for Quodsi.

## Overview

Stripe will handle all payment processing and subscription management for Quodsi. This integration works alongside the Azure AD B2C authentication system, where:

- Azure AD B2C handles user identity (who the user is)
- Stripe handles subscription status (what the user can access)

## Prerequisites

- Stripe account created and verified
- Azure AD B2C tenant configured
- Backend API (Azure Functions) project ready for integration
- React application project ready for integration

## Step 1: Create a Stripe Account

If you haven't already:

1. Go to [Stripe's website](https://stripe.com) and click **Start now**
2. Enter your email and create a password
3. Provide your business details
4. Verify your account

## Step 2: Configure Your Stripe Dashboard

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)

2. Complete the account activation steps if prompted

3. Configure your business settings:
   - Navigate to **Settings** > **Business settings**
   - Update your business information
   - Configure your branding
   - Set up your payout schedule

4. Set up your test environment:
   - Ensure you're in **Test mode** during development (toggle in the dashboard)
   - Note the test API keys for development

## Step 3: Create Subscription Products and Prices

### Define Quodsi Subscription Tiers

1. Navigate to **Products** in your Stripe Dashboard

2. Create products for each subscription tier:

   a. **Free Tier**:
      - Click **+ Add product**
      - Name: "Quodsi Free"
      - Description: "Basic simulation features with limited usage"
      - Click **Save product**
      - Click **+ Add price**
      - Price: $0.00
      - Recurring: Monthly
      - Click **Save price**

   b. **Professional Tier**:
      - Click **+ Add product**
      - Name: "Quodsi Professional"
      - Description: "Full simulation features for individual users"
      - Click **Save product**
      - Click **+ Add price**
      - Price: $19.99 (or your chosen price)
      - Recurring: Monthly
      - Click **Save price**
      - Add another price for annual billing with discount
        - Price: $199.99 (or your chosen annual price)
        - Recurring: Yearly
        - Click **Save price**

   c. **Team Tier**:
      - Click **+ Add product**
      - Name: "Quodsi Team"
      - Description: "Collaboration features for multiple users"
      - Click **Save product**
      - Add different prices based on user count
        - E.g., price tiers for 5, 10, 20 users

   d. **Enterprise Tier**:
      - Click **+ Add product**
      - Name: "Quodsi Enterprise"
      - Description: "Custom features and priority support"
      - Set this as a product with custom pricing (contact sales)

3. Note the Product and Price IDs for each subscription tier, as you'll need these later

## Step 4: Configure Stripe Webhooks

Webhooks allow Stripe to notify your application about events:

1. Navigate to **Developers** > **Webhooks** in your Stripe Dashboard

2. Click **+ Add endpoint**

3. Enter your webhook endpoint URL:
   - For production: `https://your-api-domain.com/api/stripe-webhook`
   - For development: Use Stripe CLI for local testing (see below)

4. Select events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`

5. Click **Add endpoint**

6. Note the **Signing Secret** that's generated—you'll need this to verify webhook authenticity

## Step 5: Configure Stripe Customer Portal

Allow users to manage their subscriptions directly:

1. Navigate to **Settings** > **Customer Portal** in your Stripe Dashboard

2. Configure the portal settings:
   - Enable features users can access
   - Configure branding
   - Set product and price visibility
   - Configure business information

3. Save your settings

4. Note the configuration ID for use in your application

## Step 6: Set Up Local Development Environment

For local development testing:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Log in to your Stripe account:
   ```bash
   stripe login
   ```

3. Forward events to your local server:
   ```bash
   stripe listen --forward-to http://localhost:7071/api/stripe-webhook
   ```

4. Note the webhook signing secret provided by the CLI

## Step 7: Configure API Keys and Secrets

Store your Stripe API keys securely:

### Production Environment

1. Add your Stripe API keys to Azure Key Vault:
   - Navigate to your Key Vault in the Azure Portal
   - Add secrets for:
     - `STRIPE-PUBLISHABLE-KEY`
     - `STRIPE-SECRET-KEY`
     - `STRIPE-WEBHOOK-SECRET`

2. Configure your Azure Function App to access these secrets:
   - Add Key Vault reference to your app settings
   - Configure Managed Identity for secure access

### Development Environment

1. Create a `.env` file for your React app:
   ```
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
   ```

2. Create a `local.settings.json` file for your Azure Functions:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "STRIPE_SECRET_KEY": "sk_test_your_test_key",
       "STRIPE_WEBHOOK_SECRET": "whsec_your_webhook_secret",
       "STRIPE_PRODUCT_PRO": "prod_your_product_id",
       "STRIPE_PRODUCT_TEAM": "prod_your_product_id",
       "STRIPE_PRODUCT_ENTERPRISE": "prod_your_product_id"
     }
   }
   ```

## Step 8: Integrate Stripe Libraries

### Backend Integration (Node.js Azure Functions)

1. Install the Stripe Node.js library:
   ```bash
   npm install stripe
   ```

2. Initialize Stripe in your backend:
   ```javascript
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   ```

### Frontend Integration (React)

1. Install the Stripe React components:
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. Initialize Stripe in your React app:
   ```jsx
   import { loadStripe } from '@stripe/stripe-js';
   
   const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
   
   function App() {
     return (
       <Elements stripe={stripePromise}>
         <CheckoutForm />
       </Elements>
     );
   }
   ```

## Step 9: Implement Checkout Sessions

For subscription checkout:

```javascript
// Backend API endpoint to create a checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { priceId, userId } = req.body;
    
    // Create a new checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription-cancel`,
      client_reference_id: userId, // Store the user ID for reference
    });
    
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
```

## Step 10: Test the Integration

Test the complete subscription flow:

1. Create a test user in your B2C tenant
2. Sign in to your application
3. Initiate a subscription purchase
4. Use Stripe test card numbers:
   - `4242 4242 4242 4242` for successful payments
   - `4000 0000 0000 0002` for declined payments
5. Verify webhook events are received
6. Check that the user's subscription status is updated in your database

## Stripe Testing Tools

Stripe provides several tools for testing:

- **Test Clock**: Simulate time passing for subscription lifecycle testing
- **Test Webhooks**: Send test webhook events
- **Test Cards**: Different cards to simulate various payment scenarios
- **Radar Testing**: Simulate fraud detection scenarios

## Production Checklist

Before going live:

1. Complete Stripe account verification
2. Switch from test mode to live mode
3. Secure your production API keys
4. Implement proper error handling
5. Set up monitoring for subscription events
6. Configure email notifications for payment issues
7. Implement subscription analytics

## Next Steps

After completing the Stripe setup:

1. Implement [subscription plans](./subscription_plans.md) configuration
2. Configure [payment processing](./payment_processing.md)
3. Set up [subscription lifecycle management](./subscription_lifecycle.md)
4. Implement [webhook handling](./subscription_webhooks.md) for subscription events

## Troubleshooting

### Common Issues

- **Webhook Verification Fails**: Check your webhook secret and Stripe-Signature header
- **Test Cards Not Working**: Ensure you're in test mode during development
- **Subscription Status Not Updating**: Verify webhook events are being received
- **API Key Issues**: Confirm you're using the correct public/secret keys

### Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)
- [Stripe API Reference](https://stripe.com/docs/api)
