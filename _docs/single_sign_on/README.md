# Quodsi Single Sign-On with Subscription Management

This documentation outlines the implementation of Single Sign-On (SSO) with subscription management for the Quodsi LucidChart extension. The architecture combines Azure AD B2C for identity management with Stripe for subscription handling.

## Core Architecture

The Quodsi authentication and authorization system consists of three key layers:

1. **Identity Layer** (Azure AD B2C)
   - Handles user authentication (proving who the user is)
   - Manages user profile information
   - Provides secure token issuance

2. **Subscription Layer** (Stripe)
   - Manages payment processing
   - Tracks subscription status and plan tier
   - Handles subscription lifecycle events via webhooks

3. **Authorization Layer** (Quodsi Backend)
   - Combines identity and subscription information
   - Makes access control decisions
   - Enforces feature limitations based on subscription tier

## Authentication Flow

```
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   LucidChart  │          │  Quodsi React │          │  Azure AD B2C │
│   Panel       │◄────────►│  Application  │◄────────►│    Service    │
│               │          │               │          │               │
└───────────────┘          └───────┬───────┘          └───────────────┘
                                   │
                                   ▼
                           ┌───────────────┐          ┌───────────────┐
                           │  Quodsi API   │◄────────►│     Stripe    │
                           │  Backend      │          │  Subscription │
                           │               │          │    Service    │
                           └───────────────┘          └───────────────┘
```

The flow combines identity and subscription verification:

1. User accesses Quodsi through LucidChart Panel
2. React app authenticates user through Azure AD B2C
3. Backend validates identity token from B2C
4. Backend checks subscription status with Stripe
5. Access is granted based on both identity and subscription status

## Subscription-Based Authorization

Quodsi implements a tiered access model:

- **Free Tier**: Basic features with limited usage
- **Professional Tier**: Full feature access for individuals
- **Team Tier**: Collaboration features for multiple users
- **Enterprise Tier**: Custom features and support

Features are enabled or limited based on the user's current subscription status.

## Documentation Structure

This documentation is organized into sections that follow the implementation process:

1. [**Prerequisites**](./01-prerequisites): Requirements for all systems involved
2. [**Azure AD B2C**](./02-azure_ad_b2c): Identity management setup
3. [**Stripe Integration**](./03-stripe_integration): Payment and subscription processing
4. [**React Implementation**](./04-react_implementation): Frontend authentication and subscription logic
5. [**Backend Implementation**](./05-backend_implementation): API security and subscription validation
6. [**LucidChart Integration**](./06-lucidchart_integration): Panel SDK implementation
7. [**Testing**](./07-testing): Validation strategies for the integrated system
8. [**Deployment**](./08-deployment): Guidelines for different environments

## Key Security Considerations

- **Token Security**: Secure handling of authentication tokens
- **Payment Information**: No storage of payment details (handled by Stripe)
- **Cross-Origin Communication**: Secure messaging between frames
- **API Protection**: Validating both identity and subscription for API access
- **Webhook Verification**: Ensuring webhook events from Stripe are authentic

## Getting Started

To begin implementing the SSO with subscription management:

1. Set up the Azure AD B2C tenant (see [02-azure_ad_b2c/tenant_setup.md](./02-azure_ad_b2c/tenant_setup.md))
2. Configure Stripe for subscription management (see [03-stripe_integration/stripe_setup.md](./03-stripe_integration/stripe_setup.md))
3. Implement the authentication components in React (see [04-react_implementation](./04-react_implementation))
4. Set up the backend API for token and subscription validation (see [05-backend_implementation](./05-backend_implementation))

Each section contains detailed guides for specific implementation tasks.
