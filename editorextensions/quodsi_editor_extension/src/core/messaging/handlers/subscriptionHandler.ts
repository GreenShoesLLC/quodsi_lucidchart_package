import { EnvelopeBase, EnvelopeMessageType, SubscriptionTier, SubscriptionStatus } from '@quodsi/shared';
import { router } from '../index';

/**
 * Handler for subscription-related messages
 */
export class SubscriptionHandler {
  /**
   * Handle messages related to subscription
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SUBSCRIPTION_CHANGE_REQUEST:
        return SubscriptionHandler.handleChangeRequest(msg);
        
      case EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT:
        return SubscriptionHandler.handleChangeResult(msg);
        
      // Not a subscription message
      default:
        return false;
    }
  }
  
  /**
   * Handle subscription change request
   * 
   * @param msg SUBSCRIPTION_CHANGE_REQUEST message
   * @returns True indicating message was handled
   */
  private static handleChangeRequest(msg: EnvelopeBase): boolean {
    const data = msg.data as { requestedTier: 'pro' | 'enterprise'; returnUrl?: string };
    
    console.log('[SubscriptionHandler] Subscription change requested', { 
      tier: data.requestedTier, 
      returnUrl: data.returnUrl 
    });
    
    // TODO: Open billing portal or redirect to subscription page
    // For now, simulate a successful change for development
    setTimeout(() => {
      router.updateSubscription(
        data.requestedTier as SubscriptionTier,
        'active' as SubscriptionStatus
      );
      
      // Send change result
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true,
          tier: data.requestedTier
        }
      });
    }, 1000);
    
    return true;
  }
  
  /**
   * Handle subscription change result
   * 
   * @param msg SUBSCRIPTION_CHANGE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleChangeResult(msg: EnvelopeBase): boolean {
    const data = msg.data as { success: boolean; tier?: SubscriptionTier; errorMsg?: string };
    
    console.log('[SubscriptionHandler] Subscription change result', { 
      success: data.success, 
      tier: data.tier,
      errorMsg: data.errorMsg
    });
    
    if (data.success && data.tier) {
      // Update router's subscription state
      router.updateSubscription(data.tier, 'active' as SubscriptionStatus);
    }
    
    return true;
  }
  
  /**
   * Update subscription from external event (e.g., webhook)
   * 
   * @param tier Subscription tier
   * @param status Status of the subscription
   * @param expiresAt Expiration date for grace period
   * @param featureFlags Feature flags
   */
  public static updateSubscriptionFromWebhook(
    tier: SubscriptionTier,
    status: SubscriptionStatus,
    expiresAt?: string,
    featureFlags?: Record<string, boolean>
  ): void {
    console.log('[SubscriptionHandler] Subscription updated from webhook', {
      tier,
      status,
      expiresAt,
      featureFlags
    });
    
    // Update router's subscription state
    router.updateSubscription(tier, status, expiresAt, featureFlags);
  }
}
