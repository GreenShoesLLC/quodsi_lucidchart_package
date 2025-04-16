# Stripe Requirements for Quodsi SSO Implementation

This document outlines the Stripe-specific requirements for implementing Quodsi's subscription management system, which works alongside the SSO solution to manage access levels and feature availability.

## Stripe Account Requirements

### Account Type

For subscription management, you need a Stripe account with:

- **Standard or Express** account type
- **Ability to create recurring subscriptions**
- **Access to the Stripe API and webhooks**

Account requirements vary by country/region. Ensure your Stripe account is:
- Fully verified
- Configured for your business type
- Compliant with regional requirements

### Business Information

To set up your Stripe account properly, have the following information ready:

- Legal business name
- Tax identification number
- Business address
- Bank account for payouts
- Representative personal information (for verification)

## Stripe Integration Requirements

### API Access

You'll need to create API keys in your Stripe account:

- **Publishable Key**: Used in the frontend for payment form initialization
- **Secret Key**: Used in the backend for secure API calls
- **Webhook Signing Secret**: Used to verify webhook authenticity

> **⚠️ Security Notice:** Never expose your Secret Key in client-side code or public repositories.

### Services & Features

| Stripe Service | Required? | Purpose |
|----------------|-----------|---------|
| Stripe Billing | Yes | Subscription management |
| Stripe Checkout | Yes | Secure payment collection |
| Stripe Customer Portal | Recommended | Self-service subscription management |
| Stripe Tax | Optional | Automated tax calculation |
| Stripe Radar | Recommended | Fraud prevention |
| Stripe WebhooksRe | Yes | Real-time subscription events |

### Product & Price Configuration

For Quodsi's tiered subscription model, you'll need to configure:

1. **Products** in Stripe to represent subscription tiers:
   - Free
   - Professional
   - Team
   - Enterprise

2. **Prices** attached to each product for:
   - Monthly billing
   - Annual billing (with discount)
   - Different user count tiers (for Team/Enterprise)

## Technical Requirements

### API Version

Use Stripe API version `2023-10-16` or newer.

### Libraries

| Component | Library | Minimum Version |
|-----------|---------|-----------------|
| Backend | stripe-node | 11.x |
| Frontend | @stripe/stripe-js | 1.x |
| Frontend | @stripe/react-stripe-js | 1.x |

### Webhooks

Configure webhooks to listen for these event types:

```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.trial_will_end
invoice.payment_succeeded
invoice.payment_failed
invoice.upcoming
```

### Testing Capabilities

Set up testing tools:

- **Stripe CLI** for local webhook testing
- **Test mode API keys** for development
- **Test clock** for subscription lifecycle testing
- **Test cards** for payment testing

## Data Requirements

### Customer Data Handling

For proper subscription management, track:

- Link between Stripe Customer ID and Azure B2C User ID
- Current subscription status
- Billing history
- Payment method information (handled by Stripe)

> **Note:** Do not store full payment card data in your database; Stripe provides secure storage and tokens.

### Database Schema Updates

Your database schema needs fields to track:

```
User Table:
- stripe_customer_id: string
- stripe_subscription_id: string
- subscription_status: enum
- subscription_tier: enum
- subscription_start_date: datetime
- subscription_end_date: datetime
- trial_end_date: datetime
```

## Security & Compliance

### PCI Compliance

Using Stripe correctly helps maintain PCI compliance:

- Use Stripe Elements or Checkout for collecting payment information
- Never handle raw card data directly
- Follow Stripe's security recommendations

### Data Protection

Ensure compliance with:

- GDPR (if serving European customers)
- CCPA (if serving California customers)
- Other regional data protection regulations

## Stripe Dashboard Configuration

Configure your Stripe Dashboard for:

1. **Email receipts and notifications**
2. **Branding of customer-facing content**
3. **Dunning management** (retry logic for failed payments)
4. **Account team access and permissions**

## Estimated Costs

| Stripe Service | Fee Structure |
|----------------|---------------|
| Transaction Fees | 2.9% + $0.30 per successful charge |
| Subscription Management | Included in transaction fees |
| International Cards | Additional 1% |
| Disputed Charges | $15.00 per dispute |

> **Note:** Fees vary by country and business volume. Check the [Stripe Pricing](https://stripe.com/pricing) page for the most current information.

## Next Steps

1. [Create a Stripe account](https://dashboard.stripe.com/register) if you don't have one
2. Complete account verification
3. Set up test mode for development
4. Create products and prices for your subscription tiers
5. Generate API keys for your development environment
6. Proceed to [Stripe setup documentation](../03-stripe_integration/stripe_setup.md)
