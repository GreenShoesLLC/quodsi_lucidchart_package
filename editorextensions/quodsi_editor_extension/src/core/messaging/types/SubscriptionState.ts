import { SubscriptionTier, SubscriptionStatus } from '@quodsi/shared';

/**
 * Subscription state structure
 * Represents the current subscription state of the user
 */
export interface SubscriptionState {
  tier?: SubscriptionTier;                 // Subscription tier level
  status?: SubscriptionStatus;             // Current subscription status
  expiresAt?: string;                      // Expiration date (for in_grace status)
  featureFlags?: Record<string, boolean>;  // Feature flags enabled for this subscription
}
