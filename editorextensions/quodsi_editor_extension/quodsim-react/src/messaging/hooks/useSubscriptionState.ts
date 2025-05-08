import { useMemo } from 'react';
import { useSubscription } from '../MessageProvider';
import { useSubscriptionSender } from '../senders/subscriptionSender';
import { SubscriptionTier, SubscriptionStatus } from '../state/types';

/**
 * Enhanced hook for subscription state that combines state and actions
 * 
 * @returns Subscription state and subscription-related actions
 */
export function useSubscriptionState() {
  const subscription = useSubscription();
  const { requestSubscriptionChange } = useSubscriptionSender();
  
  // Combine state and actions into a single object
  const subscriptionState = useMemo(() => {
    // Convert features array to a feature map for easier access
    const featureMap = (subscription.features || []).reduce((map, feature) => {
      map[feature] = true;
      return map;
    }, {} as Record<string, boolean>);
    
    return {
      // State
      tier: subscription.tier,
      status: subscription.status,
      expiresAt: subscription.expiresAt,
      features: subscription.features || [],
      
      // Computed properties
      isActive: subscription.status === SubscriptionStatus.ACTIVE,
      isError: subscription.status === SubscriptionStatus.ERROR,
      isPending: subscription.status === SubscriptionStatus.PENDING,
      isCancelled: subscription.status === SubscriptionStatus.CANCELLED,
      isFree: subscription.tier === SubscriptionTier.FREE,
      isPro: subscription.tier === SubscriptionTier.PRO,
      isEnterprise: subscription.tier === SubscriptionTier.ENTERPRISE,
      
      // Feature helpers
      hasFeature: (feature: string) => featureMap[feature] === true || (subscription.features || []).includes(feature),
      
      // Actions
      upgradeToPro: (returnUrl?: string) => 
        requestSubscriptionChange("pro", returnUrl),
      upgradeToEnterprise: (returnUrl?: string) => 
        requestSubscriptionChange("enterprise", returnUrl),
      changeTier: (tier: SubscriptionTier | string, returnUrl?: string) => {
        // Convert enum value to string if needed
        let tierString: "pro" | "enterprise";
        if (tier === SubscriptionTier.PRO || tier === "pro") {
          tierString = "pro";
        } else {
          tierString = "enterprise";
        }
        return requestSubscriptionChange(tierString, returnUrl);
      }
    };
  }, [
    subscription.tier,
    subscription.status,
    subscription.expiresAt,
    subscription.features,
    requestSubscriptionChange
  ]);
  
  return subscriptionState;
}
