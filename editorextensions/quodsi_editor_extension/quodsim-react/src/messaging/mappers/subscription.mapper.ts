import { EnvelopeBase, EnvelopeMessageType, SubscriptionStatus, SubscriptionTier } from '@quodsi/shared';
import { MessagingAction } from '../reducer';
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
        tier: SubscriptionTier;
        status: SubscriptionStatus;
        expiresAt?: string;
        featureFlags?: Record<string, boolean>;
      };

      // Map to subscription update action
      return {
        type: 'SUBSCRIPTION_UPDATE',
        tier: statusData.tier,
        status: statusData.status,
        expiresAt: statusData.expiresAt,
        featureFlags: statusData.featureFlags
      };

    case EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT:
      // Extract change result data
      const changeData = msg.data as {
        success: boolean;
        tier?: SubscriptionTier;
        errorMsg?: string;
      };

      // If success, update subscription
      if (changeData.success && changeData.tier) {
        return {
          type: 'SUBSCRIPTION_UPDATE',
          tier: changeData.tier,
          status: 'active' as SubscriptionStatus,
          // Don't set other fields - they'll be sent in a subsequent SUBSCRIPTION_STATUS message
        };
      } 
      // If error, set app error
      else if (!changeData.success && changeData.errorMsg) {
        return {
          type: 'APP_ERROR',
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

      // Map to app error action
      return {
        type: 'APP_ERROR',
        error: `Subscription error (${errorData.code}): ${errorData.message}`
      };

    default:
      return null;
  }
}
