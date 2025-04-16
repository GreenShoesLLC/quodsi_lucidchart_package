# Subscription Webhooks Implementation

This document provides detailed instructions for implementing Stripe webhook handling to manage subscription events in the Quodsi application.

## Overview

Webhooks allow Stripe to notify your application about events that happen in your account, such as subscription creation, updates, or payment failures. Properly handling these events is crucial for maintaining accurate subscription statuses in your application.

## Prerequisites

- Stripe account set up with subscription products and prices
- Azure Function App configured for backend API
- Database structure to store user and subscription information
- Secret management solution (Azure Key Vault recommended)

## Step 1: Set Up Webhook Endpoints in Stripe

First, configure Stripe to send webhook events to your application:

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** > **Webhooks**
3. Click **+ Add endpoint**
4. Enter your webhook endpoint URL:
   - Production: `https://your-api-domain.com/api/stripe-webhook`
   - Development: Use Stripe CLI for local testing
5. Select the events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
6. Click **Add endpoint**
7. Note the **Signing Secret** that's generated—you'll need this to verify webhook authenticity

## Step 2: Create Webhook Handler Azure Function

Implement an Azure Function to process webhook events:

```javascript
// function/stripeWebhook/index.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { updateSubscription, createCustomer } = require('../services/subscriptionService');

module.exports = async function (context, req) {
    try {
        // Get the signature from the headers
        const signature = req.headers['stripe-signature'];
        
        if (!signature) {
            context.log.error('Missing Stripe signature');
            context.res = {
                status: 400,
                body: { error: 'Missing stripe-signature header' }
            };
            return;
        }
        
        // Verify the event using the webhook secret
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody,  // Raw request body
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            context.log.error(`Webhook signature verification failed: ${err.message}`);
            context.res = {
                status: 400,
                body: { error: `Webhook Error: ${err.message}` }
            };
            return;
        }
        
        // Handle the event based on its type
        await handleEvent(event, context);
        
        // Return a response to acknowledge receipt of the event
        context.res = {
            status: 200,
            body: { received: true }
        };
    } catch (error) {
        context.log.error(`Error processing webhook: ${error.message}`);
        context.res = {
            status: 500,
            body: { error: 'Internal server error' }
        };
    }
};

/**
 * Handle different webhook event types
 */
async function handleEvent(event, context) {
    const eventType = event.type;
    const data = event.data.object;
    
    context.log.info(`Processing webhook event: ${eventType}`);
    
    switch (eventType) {
        case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(data, context);
            break;
            
        case 'customer.subscription.created':
            await handleSubscriptionCreated(data, context);
            break;
            
        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(data, context);
            break;
            
        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(data, context);
            break;
            
        case 'invoice.payment_succeeded':
            await handleInvoicePaymentSucceeded(data, context);
            break;
            
        case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(data, context);
            break;
            
        default:
            context.log.info(`Unhandled event type: ${eventType}`);
    }
}
```

## Step 3: Implement Event Handlers

Create handlers for each webhook event type:

```javascript
/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes checkout
 */
async function handleCheckoutSessionCompleted(session, context) {
    try {
        // Check if this is a subscription checkout
        if (session.mode !== 'subscription') {
            context.log.info('Not a subscription checkout');
            return;
        }
        
        // Get the customer ID
        const customerId = session.customer;
        
        // Get the client reference ID (should be the Azure B2C user ID)
        const azureUserId = session.client_reference_id;
        
        if (!azureUserId) {
            context.log.error('No Azure user ID found in client_reference_id');
            return;
        }
        
        // Create or update customer record in database
        await createCustomer(azureUserId, customerId);
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Update subscription in database
        await updateSubscriptionFromStripe(subscription, azureUserId, context);
        
        context.log.info(`Checkout completed for user ${azureUserId}`);
    } catch (error) {
        context.log.error(`Error handling checkout.session.completed: ${error.message}`);
        throw error;
    }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription, context) {
    try {
        // Get the customer ID
        const customerId = subscription.customer;
        
        // Find the user associated with this Stripe customer
        const user = await getUserByStripeCustomerId(customerId);
        
        if (!user) {
            context.log.error(`No user found for Stripe customer ${customerId}`);
            return;
        }
        
        // Update subscription in database
        await updateSubscriptionFromStripe(subscription, user.azureB2CObjectId, context);
        
        context.log.info(`Subscription created for user ${user.azureB2CObjectId}`);
    } catch (error) {
        context.log.error(`Error handling subscription.created: ${error.message}`);
        throw error;
    }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription, context) {
    try {
        // Get the customer ID
        const customerId = subscription.customer;
        
        // Find the user associated with this Stripe customer
        const user = await getUserByStripeCustomerId(customerId);
        
        if (!user) {
            context.log.error(`No user found for Stripe customer ${customerId}`);
            return;
        }
        
        // Update subscription in database
        await updateSubscriptionFromStripe(subscription, user.azureB2CObjectId, context);
        
        context.log.info(`Subscription updated for user ${user.azureB2CObjectId}`);
    } catch (error) {
        context.log.error(`Error handling subscription.updated: ${error.message}`);
        throw error;
    }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription, context) {
    try {
        // Get the customer ID
        const customerId = subscription.customer;
        
        // Find the user associated with this Stripe customer
        const user = await getUserByStripeCustomerId(customerId);
        
        if (!user) {
            context.log.error(`No user found for Stripe customer ${customerId}`);
            return;
        }
        
        // Update the user's subscription status to inactive
        await updateSubscription(user.azureB2CObjectId, {
            subscriptionId: null,
            subscriptionStatus: 'canceled',
            subscriptionTier: 'free', // Revert to free tier
            subscriptionExpiryDate: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: false
        });
        
        // Invalidate any cached subscription data
        await invalidateSubscriptionCache(user.azureB2CObjectId);
        
        context.log.info(`Subscription deleted for user ${user.azureB2CObjectId}`);
    } catch (error) {
        context.log.error(`Error handling subscription.deleted: ${error.message}`);
        throw error;
    }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice, context) {
    try {
        // Check if this is a subscription invoice
        if (!invoice.subscription) {
            context.log.info('Not a subscription invoice');
            return;
        }
        
        // Get the customer ID
        const customerId = invoice.customer;
        
        // Find the user associated with this Stripe customer
        const user = await getUserByStripeCustomerId(customerId);
        
        if (!user) {
            context.log.error(`No user found for Stripe customer ${customerId}`);
            return;
        }
        
        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        
        // Update subscription in database
        await updateSubscriptionFromStripe(subscription, user.azureB2CObjectId, context);
        
        context.log.info(`Invoice payment succeeded for user ${user.azureB2CObjectId}`);
    } catch (error) {
        context.log.error(`Error handling invoice.payment_succeeded: ${error.message}`);
        throw error;
    }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice, context) {
    try {
        // Check if this is a subscription invoice
        if (!invoice.subscription) {
            context.log.info('Not a subscription invoice');
            return;
        }
        
        // Get the customer ID
        const customerId = invoice.customer;
        
        // Find the user associated with this Stripe customer
        const user = await getUserByStripeCustomerId(customerId);
        
        if (!user) {
            context.log.error(`No user found for Stripe customer ${customerId}`);
            return;
        }
        
        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        
        // Update subscription in database
        await updateSubscriptionFromStripe(subscription, user.azureB2CObjectId, context);
        
        // Send notification about failed payment
        await sendPaymentFailedNotification(user.email, invoice.id);
        
        context.log.info(`Invoice payment failed for user ${user.azureB2CObjectId}`);
    } catch (error) {
        context.log.error(`Error handling invoice.payment_failed: ${error.message}`);
        throw error;
    }
}
```

## Step 4: Create Subscription Update Helper

Implement a helper function to update subscription data:

```javascript
/**
 * Update subscription data from Stripe subscription object
 */
async function updateSubscriptionFromStripe(subscription, azureUserId, context) {
    try {
        // Get price and product information
        const priceId = subscription.items.data[0]?.price.id;
        if (!priceId) {
            context.log.error('No price ID found in subscription');
            return;
        }
        
        // Get product details
        const price = await stripe.prices.retrieve(priceId, {
            expand: ['product']
        });
        
        // Get subscription tier from product metadata
        const tier = price.product.metadata.tier || 'free';
        
        // Map Stripe status to our status
        const statusMap = {
            'active': 'active',
            'past_due': 'past_due',
            'unpaid': 'unpaid',
            'canceled': 'canceled',
            'incomplete': 'incomplete',
            'incomplete_expired': 'incomplete_expired',
            'trialing': 'trial'
        };
        
        const status = statusMap[subscription.status] || 'inactive';
        
        // Update subscription in database
        await updateSubscription(azureUserId, {
            subscriptionId: subscription.id,
            subscriptionStatus: status,
            subscriptionTier: tier,
            subscriptionExpiryDate: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
        });
        
        // Invalidate any cached subscription data
        await invalidateSubscriptionCache(azureUserId);
    } catch (error) {
        context.log.error(`Error updating subscription from Stripe: ${error.message}`);
        throw error;
    }
}
```

## Step 5: Create Subscription Service

Implement a service for managing subscription data in your database:

```javascript
// services/subscriptionService.js
const { getContainer } = require('../utils/cosmosClient');
const { cacheDelete } = require('../utils/cacheUtil');
const { GraphServiceClient } = require('@microsoft/microsoft-graph-sdk');
const { getGraphClient } = require('../utils/graphClient');

// User container
const usersContainer = getContainer('Users');

/**
 * Create or update customer record
 */
async function createCustomer(azureUserId, stripeCustomerId) {
    try {
        // Check if user exists
        const querySpec = {
            query: "SELECT * FROM c WHERE c.azureB2CObjectId = @azureId",
            parameters: [
                {
                    name: "@azureId",
                    value: azureUserId
                }
            ]
        };
        
        const { resources } = await usersContainer.items
            .query(querySpec)
            .fetchAll();
        
        if (resources.length > 0) {
            // Update existing user
            const user = resources[0];
            user.stripeCustomerId = stripeCustomerId;
            user.updatedAt = new Date().toISOString();
            
            await usersContainer.item(user.id).replace(user);
            return user;
        } else {
            // Create new user
            const newUser = {
                azureB2CObjectId: azureUserId,
                stripeCustomerId: stripeCustomerId,
                subscriptionId: null,
                subscriptionStatus: 'free',
                subscriptionTier: 'free',
                subscriptionExpiryDate: null,
                cancelAtPeriodEnd: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const { resource } = await usersContainer.items.create(newUser);
            return resource;
        }
    } catch (error) {
        console.error(`Error creating/updating customer: ${error.message}`);
        throw error;
    }
}

/**
 * Get user by Stripe customer ID
 */
async function getUserByStripeCustomerId(stripeCustomerId) {
    try {
        const querySpec = {
            query: "SELECT * FROM c WHERE c.stripeCustomerId = @customerId",
            parameters: [
                {
                    name: "@customerId",
                    value: stripeCustomerId
                }
            ]
        };
        
        const { resources } = await usersContainer.items
            .query(querySpec)
            .fetchAll();
        
        return resources.length > 0 ? resources[0] : null;
    } catch (error) {
        console.error(`Error getting user by Stripe customer ID: ${error.message}`);
        throw error;
    }
}

/**
 * Update subscription data
 */
async function updateSubscription(azureUserId, subscriptionData) {
    try {
        // Update user in database
        const querySpec = {
            query: "SELECT * FROM c WHERE c.azureB2CObjectId = @azureId",
            parameters: [
                {
                    name: "@azureId",
                    value: azureUserId
                }
            ]
        };
        
        const { resources } = await usersContainer.items
            .query(querySpec)
            .fetchAll();
        
        if (resources.length > 0) {
            const user = resources[0];
            
            // Update subscription fields
            user.subscriptionId = subscriptionData.subscriptionId;
            user.subscriptionStatus = subscriptionData.subscriptionStatus;
            user.subscriptionTier = subscriptionData.subscriptionTier;
            user.subscriptionExpiryDate = subscriptionData.subscriptionExpiryDate;
            user.cancelAtPeriodEnd = subscriptionData.cancelAtPeriodEnd;
            user.updatedAt = new Date().toISOString();
            
            await usersContainer.item(user.id).replace(user);
            
            // Update Azure B2C custom attributes
            await updateAzureB2CAttributes(azureUserId, {
                subscriptionStatus: subscriptionData.subscriptionStatus,
                subscriptionTier: subscriptionData.subscriptionTier
            });
            
            return user;
        } else {
            throw new Error(`User not found with Azure ID: ${azureUserId}`);
        }
    } catch (error) {
        console.error(`Error updating subscription: ${error.message}`);
        throw error;
    }
}

/**
 * Update Azure B2C custom attributes
 */
async function updateAzureB2CAttributes(azureUserId, attributes) {
    try {
        // Get Microsoft Graph client
        const graphClient = await getGraphClient();
        
        // Create update object
        const updateObject = {};
        
        // Add extension attributes
        const extensionPrefix = 'extension_your-app-id_';
        
        if (attributes.subscriptionStatus) {
            updateObject[`${extensionPrefix}subscriptionStatus`] = attributes.subscriptionStatus;
        }
        
        if (attributes.subscriptionTier) {
            updateObject[`${extensionPrefix}subscriptionTier`] = attributes.subscriptionTier;
        }
        
        // Update user
        await graphClient.api(`/users/${azureUserId}`).update(updateObject);
    } catch (error) {
        console.error(`Error updating B2C attributes: ${error.message}`);
        // Don't throw here, as this should not block subscription updates
        // Just log the error and continue
    }
}

/**
 * Invalidate subscription cache
 */
async function invalidateSubscriptionCache(azureUserId) {
    try {
        await cacheDelete(`subscription:${azureUserId}`);
    } catch (error) {
        console.error(`Error invalidating subscription cache: ${error.message}`);
        // Don't throw here, as cache invalidation failures are non-critical
    }
}

module.exports = {
    createCustomer,
    getUserByStripeCustomerId,
    updateSubscription,
    invalidateSubscriptionCache
};
```

## Step 6: Configure Webhook Security

Ensure your webhook endpoint is properly secured:

### 6.1 Request Body Parsing

Configure your Azure Function to properly handle raw request bodies for signature verification:

```javascript
// function.json for the webhook function
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "stripe-webhook"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ],
  "scriptFile": "../dist/stripeWebhook/index.js"
}
```

### 6.2 Function Configuration

Ensure your Azure Function is configured to parse the raw body:

```javascript
// host.json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxOutstandingRequests": 200,
      "maxConcurrentRequests": 100,
      "dynamicThrottlesEnabled": true,
      "enableRequestBodyRaw": true  // Important for webhook signature verification
    }
  },
  "functionTimeout": "00:05:00",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  }
}
```

## Step 7: Test Webhook Processing

Test your webhook implementation with the Stripe CLI:

### 7.1 Local Development Testing

1. Install the Stripe CLI:
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

4. Trigger test events:
   ```bash
   stripe trigger customer.subscription.created
   stripe trigger invoice.payment_succeeded
   ```

### 7.2 Webhook Testing in Production

1. Use Stripe's webhook testing tools in the Dashboard:
   - Go to **Developers** > **Webhooks** > **Test webhook**
   - Select an event type
   - Customize the event data if needed
   - Click **Send test webhook**

2. Monitor webhook deliveries and responses

## Step 8: Handling Retries and Idempotency

Ensure your webhook handlers are idempotent to handle Stripe's retry mechanism:

```javascript
/**
 * Check if event has been processed before
 */
async function isEventProcessed(eventId) {
    try {
        const querySpec = {
            query: "SELECT * FROM c WHERE c.eventId = @eventId",
            parameters: [
                {
                    name: "@eventId",
                    value: eventId
                }
            ]
        };
        
        const container = getContainer('ProcessedEvents');
        const { resources } = await container.items
            .query(querySpec)
            .fetchAll();
        
        return resources.length > 0;
    } catch (error) {
        console.error(`Error checking if event is processed: ${error.message}`);
        // If there's an error, assume not processed
        return false;
    }
}

/**
 * Mark event as processed
 */
async function markEventAsProcessed(eventId) {
    try {
        const container = getContainer('ProcessedEvents');
        await container.items.create({
            eventId: eventId,
            processedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error marking event as processed: ${error.message}`);
        // Non-critical error, can continue
    }
}

// Update handleEvent function to use idempotency check
async function handleEvent(event, context) {
    const eventId = event.id;
    
    // Check if event has been processed before
    if (await isEventProcessed(eventId)) {
        context.log.info(`Event ${eventId} already processed, skipping`);
        return;
    }
    
    // Process the event
    // ... existing event handling code
    
    // Mark event as processed
    await markEventAsProcessed(eventId);
}
```

## Step 9: Monitoring and Error Handling

### 9.1 Set Up Monitoring

Implement monitoring for webhook processing:

```javascript
/**
 * Track webhook event in monitoring
 */
function trackWebhookEvent(eventType, success, errorMessage = null) {
    const appInsights = require('applicationinsights');
    const client = appInsights.defaultClient;
    
    if (client) {
        client.trackEvent({
            name: 'StripeWebhook',
            properties: {
                eventType,
                success: success.toString(),
                errorMessage: errorMessage || '',
                timestamp: new Date().toISOString()
            }
        });
    }
}

// Update event handling to use tracking
async function handleEvent(event, context) {
    const eventType = event.type;
    
    try {
        // Process event
        // ... existing code
        
        // Track successful event
        trackWebhookEvent(eventType, true);
    } catch (error) {
        // Track failed event
        trackWebhookEvent(eventType, false, error.message);
        throw error;
    }
}
```

### 9.2 Configure Alerts

Set up alerts for webhook failures in Azure:

1. In Azure Portal, go to your Function App
2. Navigate to **Monitoring** > **Alerts**
3. Create an alert rule:
   - Signal type: Logs
   - Signal name: Custom log search
   - Search query:
     ```
     traces | where message contains "Error processing webhook" | count
     ```
   - Alert logic: Greater than threshold (e.g., 5 in 30 minutes)
   - Set up action group for notifications

## Next Steps

After implementing webhook handling:

1. Complete [payment processing](./payment_processing.md) implementation
2. Configure [subscription lifecycle management](./subscription_lifecycle.md)
3. Integrate with [React UI components](../04-react_implementation/payment_ui.md)
4. Implement [subscription checks](../04-react_implementation/subscription_checks.md) in the frontend
