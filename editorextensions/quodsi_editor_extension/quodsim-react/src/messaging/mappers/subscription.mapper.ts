import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../state/types';
import { SubscriptionStatus, SubscriptionTier } from '../state/types';
import { debugService } from '../utils/debugService';

/**
 * Maps subscription-related messages to reducer actions
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapSubscription(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't subscription-related
  if (
    msg.type !== EnvelopeMessageType.SUBSCRIPTION_STATUS &&
    msg.type !== EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT &&
    msg.type !== EnvelopeMessageType.SUBSCRIPTION_ERROR
  ) {
    return null;
  }

  debugService.debug(`Subscription mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.SUBSCRIPTION_STATUS:
      // Extract subscription status data
      const statusData = msg.data as {
        tier: string;
        status: string;
        expiresAt?: string;
        featureFlags?: Record<string, boolean>;
      };

      // Map feature flags to features array
      const features = statusData.featureFlags 
        ? Object.entries(statusData.featureFlags)
            .filter(([_, enabled]) => enabled)
            .map(([feature]) => feature)
        : undefined;

      // Map to subscription update action
      return {
        type: 'SUBSCRIPTION_STATUS_UPDATE', // Updated to match the action type in subscriptionSlice
        tier: mapTierValue(statusData.tier),
        status: mapStatusValue(statusData.status),
        expiresAt: statusData.expiresAt,
        features // Use transformed features array
      };

    case EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT:
      // Extract change result data
      const changeData = msg.data as {
        success: boolean;
        tier?: string;
        errorMsg?: string;
      };

      // If success, update subscription
      if (changeData.success && changeData.tier) {
        return {
          type: 'SUBSCRIPTION_STATUS_UPDATE', // Updated action type
          tier: mapTierValue(changeData.tier),
          status: SubscriptionStatus.ACTIVE,
          // Don't set other fields - they'll be sent in a subsequent SUBSCRIPTION_STATUS message
        };
      } 
      // If error, return subscription error
      else if (!changeData.success && changeData.errorMsg) {
        return {
          type: 'SUBSCRIPTION_ERROR', // Updated action type
          error: `Subscription change failed: ${changeData.errorMsg}`
        };
      }
      
      return null;

    case EnvelopeMessageType.SUBSCRIPTION_ERROR:
      // Extract error data
      const errorData = msg.data as {
        code: string;
        message: string;
      };

      // Map to subscription error action
      return {
        type: 'SUBSCRIPTION_ERROR', // Updated action type
        error: `Subscription error (${errorData.code}): ${errorData.message}`
      };

    default:
      return null;
  }
}

/**
 * Maps string tier values to the local SubscriptionTier enum
 * 
 * @param tier String value of tier from message
 * @returns Corresponding SubscriptionTier enum value
 */
function mapTierValue(tier: string): SubscriptionTier {
  switch (tier.toLowerCase()) {
    case 'free':
      return SubscriptionTier.FREE;
    case 'basic':
      return SubscriptionTier.BASIC;
    case 'pro':
      return SubscriptionTier.PRO;
    case 'enterprise':
      return SubscriptionTier.ENTERPRISE;
    default:
      console.warn(`Unknown subscription tier: ${tier}, defaulting to FREE`);
      return SubscriptionTier.FREE;
  }
}

/**
 * Maps string status values to the local SubscriptionStatus enum
 * 
 * @param status String value of status from message
 * @returns Corresponding SubscriptionStatus enum value
 */
function mapStatusValue(status: string): SubscriptionStatus {
  switch (status.toLowerCase()) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'inactive':
      return SubscriptionStatus.INACTIVE;
    case 'pending':
      return SubscriptionStatus.PENDING;
    case 'cancelled':
      return SubscriptionStatus.CANCELLED;
    case 'error':
      return SubscriptionStatus.ERROR;
    default:
      console.warn(`Unknown subscription status: ${status}, defaulting to INACTIVE`);
      return SubscriptionStatus.INACTIVE;
  }
}
