import { useMemo } from 'react';
import { SubscriptionTier } from '@quodsi/shared';
import { useSubscription } from '../MessageProvider';
import { useSubscriptionSender } from '../senders/subscriptionSender';

/**
 * Enhanced hook for subscription state that combines state and actions
 * 
 * @returns Subscription state and subscription-related actions
 */
export function useSubscriptionState() {
  const subscription = useSubscription();
  const { requestSubscriptionChange } = useSubscriptionSender();
  
  // Combine state and actions into a single object
  const subscriptionState = useMemo(() => ({
    // State
    tier: subscription.tier,
    status: subscription.status,
    expiresAt: subscription.expiresAt,
    featureFlags: subscription.featureFlags,
    
    // Computed properties
    isActive: subscription.status === 'active',
    isExpired: subscription.status === 'expired',
    isInGracePeriod: subscription.status === 'in_grace',
    isFree: subscription.tier === 'free',
    isPro: subscription.tier === 'pro',
    isEnterprise: subscription.tier === 'enterprise',
    
    // Feature flag helpers
    hasFeature: (feature: string) => !!subscription.featureFlags?.[feature],
    
    // Actions
    upgradeToPro: (returnUrl?: string) => 
      requestSubscriptionChange('pro', returnUrl),
    upgradeToEnterprise: (returnUrl?: string) => 
      requestSubscriptionChange('enterprise', returnUrl),
    changeTier: (tier: SubscriptionTier, returnUrl?: string) => 
      requestSubscriptionChange(tier === 'enterprise' ? 'enterprise' : 'pro', returnUrl)
  }), [
    subscription.tier,
    subscription.status,
    subscription.expiresAt,
    subscription.featureFlags,
    requestSubscriptionChange
  ]);
  
  return subscriptionState;
}
