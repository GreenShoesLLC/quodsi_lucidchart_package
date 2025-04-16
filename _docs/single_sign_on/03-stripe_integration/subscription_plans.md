# Quodsi Subscription Plans Configuration

This document outlines the subscription tiers and plans for Quodsi, including how to configure them in Stripe and integrate them with your application.

## Overview

Quodsi offers a tiered subscription model, providing different levels of access and features. This document explains how to set up these tiers in Stripe and implement feature restrictions based on subscription levels.

## Subscription Tiers

### Tier Structure

Quodsi's subscription tiers are structured as follows:

1. **Free Tier**
   - Basic simulation features
   - Limited to 5 simulations per month
   - No collaboration features
   - Basic reporting

2. **Professional Tier**
   - All simulation features
   - Unlimited simulations
   - Advanced reporting
   - Export capabilities
   - Priority support
   - Single user only

3. **Team Tier**
   - All Professional features
   - Collaboration features
   - Team management
   - User roles and permissions
   - Multiple user seats (5, 10, 20, etc.)
   - SSO capabilities

4. **Enterprise Tier**
   - All Team features
   - Custom integrations
   - Dedicated support
   - Custom feature development
   - SLA guarantees
   - Unlimited users
   - Advanced security features

## Step 1: Create Products and Prices in Stripe

Set up your subscription tiers as Products and Prices in Stripe:

### 1.1 Free Tier

```javascript
// Create Free Tier product
const freeProduct = await stripe.products.create({
  name: 'Quodsi Free',
  description: 'Basic simulation features with limited usage',
  metadata: {
    tier: 'free',
    features: JSON.stringify([
      'Basic simulation features',
      '5 simulations per month',
      'Basic reporting'
    ])
  }
});

// Create Free Tier price ($0)
const freePrice = await stripe.prices.create({
  product: freeProduct.id,
  unit_amount: 0,
  currency: 'usd',
  recurring: {
    interval: 'month'
  }
});
```

### 1.2 Professional Tier

```javascript
// Create Professional Tier product
const proProduct = await stripe.products.create({
  name: 'Quodsi Professional',
  description: 'Full simulation features for individual users',
  metadata: {
    tier: 'professional',
    features: JSON.stringify([
      'All simulation features',
      'Unlimited simulations',
      'Advanced reporting',
      'Export capabilities',
      'Priority support'
    ])
  }
});

// Create monthly price
const proMonthlyPrice = await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 1999, // $19.99
  currency: 'usd',
  recurring: {
    interval: 'month'
  }
});

// Create annual price (with discount)
const proAnnualPrice = await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 19999, // $199.99 (16.67/month)
  currency: 'usd',
  recurring: {
    interval: 'year'
  }
});
```

### 1.3 Team Tier

```javascript
// Create Team Tier product
const teamProduct = await stripe.products.create({
  name: 'Quodsi Team',
  description: 'Collaboration features for multiple users',
  metadata: {
    tier: 'team',
    features: JSON.stringify([
      'All Professional features',
      'Collaboration features',
      'Team management',
      'User roles and permissions',
      'SSO capabilities'
    ])
  }
});

// Create price for 5 users (monthly)
const team5MonthlyPrice = await stripe.prices.create({
  product: teamProduct.id,
  unit_amount: 4999, // $49.99
  currency: 'usd',
  recurring: {
    interval: 'month'
  },
  metadata: {
    seats: 5
  }
});

// Create price for 10 users (monthly)
const team10MonthlyPrice = await stripe.prices.create({
  product: teamProduct.id,
  unit_amount: 7999, // $79.99
  currency: 'usd',
  recurring: {
    interval: 'month'
  },
  metadata: {
    seats: 10
  }
});

// Create prices for annual billing
// (Similar to above but with interval: 'year' and discounted rates)
```

### 1.4 Enterprise Tier

```javascript
// Create Enterprise Tier product
const enterpriseProduct = await stripe.products.create({
  name: 'Quodsi Enterprise',
  description: 'Custom features and support for large organizations',
  metadata: {
    tier: 'enterprise',
    features: JSON.stringify([
      'All Team features',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'Unlimited users',
      'Advanced security features'
    ])
  }
});

// Note: Enterprise typically uses custom pricing, but you can create a default price
const enterprisePrice = await stripe.prices.create({
  product: enterpriseProduct.id,
  unit_amount: 99999, // $999.99
  currency: 'usd',
  recurring: {
    interval: 'month'
  }
});
```

## Step 2: Store Plan Information in Your Database

Create a mapping between Stripe products/prices and your application features:

### 2.1 Database Schema

```sql
CREATE TABLE subscription_tiers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stripe_product_id VARCHAR(100) NOT NULL,
    tier_level INTEGER NOT NULL,
    max_simulations INTEGER,
    has_collaboration BOOLEAN DEFAULT FALSE,
    has_advanced_reporting BOOLEAN DEFAULT FALSE,
    has_export BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_sso BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE subscription_prices (
    id VARCHAR(36) PRIMARY KEY,
    tier_id VARCHAR(36) NOT NULL,
    stripe_price_id VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    unit_amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    interval VARCHAR(20) NOT NULL,
    interval_count INTEGER NOT NULL DEFAULT 1,
    seats INTEGER DEFAULT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tier_id) REFERENCES subscription_tiers(id)
);
```

### 2.2 Seed Data

```javascript
// Insert subscription tiers
const tiers = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic simulation features with limited usage',
    stripe_product_id: 'prod_free_id',
    tier_level: 0,
    max_simulations: 5,
    has_collaboration: false,
    has_advanced_reporting: false,
    has_export: false,
    has_priority_support: false,
    has_sso: false
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Full simulation features for individual users',
    stripe_product_id: 'prod_pro_id',
    tier_level: 1,
    max_simulations: null, // unlimited
    has_collaboration: false,
    has_advanced_reporting: true,
    has_export: true,
    has_priority_support: true,
    has_sso: false
  },
  // Team and Enterprise tiers
];

// Insert subscription prices
const prices = [
  {
    id: 'free-monthly',
    tier_id: 'free',
    stripe_price_id: 'price_free_id',
    nickname: 'Free Monthly',
    unit_amount: 0,
    currency: 'usd',
    interval: 'month',
    interval_count: 1,
    seats: 1,
    is_default: true
  },
  {
    id: 'pro-monthly',
    tier_id: 'professional',
    stripe_price_id: 'price_pro_monthly_id',
    nickname: 'Professional Monthly',
    unit_amount: 1999,
    currency: 'usd',
    interval: 'month',
    interval_count: 1,
    seats: 1,
    is_default: true
  },
  {
    id: 'pro-annual',
    tier_id: 'professional',
    stripe_price_id: 'price_pro_annual_id',
    nickname: 'Professional Annual',
    unit_amount: 19999,
    currency: 'usd',
    interval: 'year',
    interval_count: 1,
    seats: 1,
    is_default: false
  },
  // Team and Enterprise prices
];
```

## Step 3: Configure Frontend Plan Selection UI

Create a subscription plan selection interface in your React application:

```jsx
// Example React component for plan selection
import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useStripe } from '@stripe/react-stripe-js';

function SubscriptionPlans() {
  const [tiers, setTiers] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { accounts } = useMsal();
  const stripe = useStripe();
  
  // Fetch subscription plans from your API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/subscription-plans');
        const data = await response.json();
        setTiers(data.tiers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching plans:', error);
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, []);
  
  // Handle plan selection and checkout
  const handleSelectPlan = async (priceId) => {
    if (!stripe) return;
    
    setLoading(true);
    
    try {
      // Get current user ID
      const userId = accounts[0]?.localAccountId;
      
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId })
      });
      
      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        console.error('Checkout error:', error);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading plans...</div>;
  
  return (
    <div className="subscription-plans">
      <h2>Choose Your Subscription Plan</h2>
      
      <div className="plans-container">
        {tiers.map(tier => (
          <div key={tier.id} className="plan-card">
            <h3>{tier.name}</h3>
            <p>{tier.description}</p>
            
            <ul className="features-list">
              {JSON.parse(tier.features).map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            
            <div className="price-options">
              {tier.prices.map(price => (
                <div key={price.id} className="price-option">
                  <span className="price">
                    ${(price.unit_amount / 100).toFixed(2)}
                    <span className="interval">/{price.interval}</span>
                  </span>
                  
                  <button 
                    onClick={() => handleSelectPlan(price.stripe_price_id)}
                    disabled={loading}
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscriptionPlans;
```

## Step 4: Implement Feature Restriction Logic

Create a system to enforce feature restrictions based on subscription tier:

### 4.1 Feature Permission Service

```javascript
// src/services/subscriptionService.js
/**
 * Check if a feature is available for the user's subscription tier
 */
export function hasFeatureAccess(subscriptionTier, feature) {
  // Define feature access by tier
  const featureAccess = {
    // Free tier features
    free: [
      'basic_simulation',
      'basic_reporting'
    ],
    
    // Professional tier features
    professional: [
      'basic_simulation',
      'basic_reporting',
      'advanced_simulation',
      'unlimited_simulations',
      'advanced_reporting',
      'export',
      'priority_support'
    ],
    
    // Team tier features
    team: [
      'basic_simulation',
      'basic_reporting',
      'advanced_simulation',
      'unlimited_simulations',
      'advanced_reporting',
      'export',
      'priority_support',
      'collaboration',
      'team_management',
      'user_roles',
      'sso'
    ],
    
    // Enterprise tier features
    enterprise: [
      'basic_simulation',
      'basic_reporting',
      'advanced_simulation',
      'unlimited_simulations',
      'advanced_reporting',
      'export',
      'priority_support',
      'collaboration',
      'team_management',
      'user_roles',
      'sso',
      'custom_integrations',
      'dedicated_support',
      'sla',
      'unlimited_users',
      'advanced_security'
    ]
  };
  
  // Check if feature is available for subscription tier
  return featureAccess[subscriptionTier]?.includes(feature) || false;
}

/**
 * Check if user has reached simulation limit
 */
export async function hasReachedSimulationLimit(userId, subscriptionTier) {
  // Free tier has limit of 5 simulations
  if (subscriptionTier === 'free') {
    // Get current month's simulation count from database
    const simulationCount = await getMonthlySimulationCount(userId);
    return simulationCount >= 5;
  }
  
  // Other tiers have unlimited simulations
  return false;
}
```

### 4.2 Feature Restriction Component

```jsx
// src/components/FeatureGuard.jsx
import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { hasFeatureAccess } from '../services/subscriptionService';

/**
 * Component to conditionally render based on subscription features
 */
function FeatureGuard({ feature, fallback = null, children }) {
  const { subscription } = useSubscription();
  
  // If user has access to the feature, render children
  if (hasFeatureAccess(subscription.tier, feature)) {
    return <>{children}</>;
  }
  
  // Otherwise render fallback (upgrade prompt)
  return fallback || (
    <div className="upgrade-prompt">
      <h3>Feature not available</h3>
      <p>This feature requires a higher subscription tier.</p>
      <button onClick={() => window.location.href = '/subscription-plans'}>
        Upgrade Now
      </button>
    </div>
  );
}

export default FeatureGuard;
```

### 4.3 Usage in Components

```jsx
// Example usage in simulation component
import React from 'react';
import FeatureGuard from './FeatureGuard';

function AdvancedSimulationSettings() {
  return (
    <FeatureGuard feature="advanced_simulation">
      <div className="advanced-settings">
        {/* Advanced simulation settings UI */}
      </div>
    </FeatureGuard>
  );
}

// Example usage in export component
function ExportOptions() {
  return (
    <FeatureGuard feature="export">
      <div className="export-options">
        {/* Export options UI */}
      </div>
    </FeatureGuard>
  );
}
```

## Step 5: Backend Enforcement of Subscription Limits

Ensure subscription restrictions are enforced on the server side:

```javascript
// Example Azure Function middleware
const validateSubscriptionTier = (requiredTier) => {
  return async (context, req) => {
    try {
      // Get user ID from token
      const userId = req.user?.oid || req.user?.sub;
      
      if (!userId) {
        context.res = {
          status: 401,
          body: { error: 'Unauthorized' }
        };
        return;
      }
      
      // Get user's subscription tier from database
      const userSubscription = await getUserSubscription(userId);
      
      // Define tier levels for comparison
      const tierLevels = {
        'free': 0,
        'professional': 1,
        'team': 2,
        'enterprise': 3
      };
      
      // Check if user's tier is sufficient
      if (tierLevels[userSubscription.tier] < tierLevels[requiredTier]) {
        context.res = {
          status: 403,
          body: { 
            error: 'Subscription required',
            message: `This feature requires ${requiredTier} tier or higher`,
            currentTier: userSubscription.tier,
            requiredTier: requiredTier
          }
        };
        return;
      }
      
      // If simulation operation, check limits
      if (req.method === 'POST' && req.url.includes('/simulations')) {
        const hasReachedLimit = await hasReachedSimulationLimit(userId, userSubscription.tier);
        
        if (hasReachedLimit) {
          context.res = {
            status: 403,
            body: {
              error: 'Simulation limit reached',
              message: 'You have reached your monthly simulation limit'
            }
          };
          return;
        }
      }
      
      // Proceed with the request
      context.next();
    } catch (error) {
      context.log.error('Subscription validation error:', error);
      context.res = {
        status: 500,
        body: { error: 'Internal server error' }
      };
    }
  };
};

// Usage in Azure Function
module.exports = async function (context, req) {
  // Apply middleware
  await validateSubscriptionTier('professional')(context, req);
  
  // If middleware didn't block, continue with function
  if (!context.res) {
    // Function logic here
    context.res = {
      status: 200,
      body: { message: 'Function executed successfully' }
    };
  }
};
```

## Step 6: Subscription Management UI

Create a subscription management page for users to view and manage their subscription:

```jsx
// src/pages/SubscriptionManagement.jsx
import React, { useState, useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';

function SubscriptionManagement() {
  const { subscription, loading, error } = useSubscription();
  const [customerPortalUrl, setCustomerPortalUrl] = useState('');
  
  // Fetch Stripe Customer Portal URL
  useEffect(() => {
    const getCustomerPortalUrl = async () => {
      try {
        const response = await fetch('/api/create-customer-portal-session', {
          method: 'POST'
        });
        
        const { url } = await response.json();
        setCustomerPortalUrl(url);
      } catch (error) {
        console.error('Error creating customer portal session:', error);
      }
    };
    
    if (subscription && subscription.status === 'active') {
      getCustomerPortalUrl();
    }
  }, [subscription]);
  
  if (loading) return <div>Loading subscription details...</div>;
  if (error) return <div>Error loading subscription: {error.message}</div>;
  
  return (
    <div className="subscription-management">
      <h2>Subscription Management</h2>
      
      <div className="subscription-details">
        <div className="detail-row">
          <span className="label">Current Plan:</span>
          <span className="value">{subscription.tier}</span>
        </div>
        
        <div className="detail-row">
          <span className="label">Status:</span>
          <span className="value">{subscription.status}</span>
        </div>
        
        {subscription.currentPeriodEnd && (
          <div className="detail-row">
            <span className="label">Renewal Date:</span>
            <span className="value">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {subscription.cancelAtPeriodEnd && (
          <div className="cancellation-notice">
            Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>
      
      <div className="subscription-actions">
        {customerPortalUrl && (
          <a href={customerPortalUrl} className="button primary">
            Manage Billing
          </a>
        )}
        
        {subscription.tier === 'free' && (
          <a href="/subscription-plans" className="button secondary">
            Upgrade Plan
          </a>
        )}
      </div>
    </div>
  );
}

export default SubscriptionManagement;
```

## Next Steps

After configuring subscription plans:

1. Implement [payment processing](./payment_processing.md) with Stripe Checkout
2. Set up [subscription lifecycle management](./subscription_lifecycle.md) for handling plan changes
3. Configure [webhook handling](./subscription_webhooks.md) for subscription events
4. Create [subscription reporting](../08-deployment/monitoring.md) for business metrics
