import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

/**
 * Custom hook that provides typed functions for sending subscription-related messages
 * 
 * @returns Object containing subscription message sender functions
 */
export function useSubscriptionSender() {
  const send = useSender();
  
  /**
   * Send a SUBSCRIPTION_CHANGE_REQUEST message
   * 
   * @param requestedTier The tier to upgrade/downgrade to ('pro' or 'enterprise')
   * @param returnUrl Optional URL to return to after payment flow
   */
  const requestSubscriptionChange = (
    requestedTier: 'pro' | 'enterprise',
    returnUrl?: string
  ) => {
    send(EnvelopeMessageType.SUBSCRIPTION_CHANGE_REQUEST, {
      requestedTier,
      returnUrl
    });
  };
  
  return {
    requestSubscriptionChange
  };
}
