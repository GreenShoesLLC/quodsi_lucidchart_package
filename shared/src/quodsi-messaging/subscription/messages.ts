import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/** Subscription tier types */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/** Subscription status states */
export type SubscriptionStatus = 'active' | 'in_grace' | 'expired';

/**
 * Broadcast current tier and payment status
 */
export interface SubscriptionStatusMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SUBSCRIPTION_STATUS;
  data: {
    /** Commercial plan that controls feature gating */
    tier: SubscriptionTier;

    /** Billing health: active (paid), in_grace (payment failed but grace period active), 
     * expired (features disabled until payment) */
    status: SubscriptionStatus;

    /** ISO timestamp when grace period ends. Present only for in_grace status */
    expiresAt?: string;

    /** Optional dictionary pushed by backend to enable/disable fine-grained features per tier */
    featureFlags?: Record<string, boolean>;
  };
}

/**
 * Sent when user clicks Upgrade/Downgrade
 */
export interface SubscriptionChangeRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SUBSCRIPTION_CHANGE_REQUEST;
  data: {
    /** The tier the user wants to upgrade/downgrade to */
    requestedTier: 'pro' | 'enterprise';

    /** Optional URL to return to after the payment flow completes */
    returnUrl?: string;
  };
}

/**
 * Sent when the portal flow is completed
 */
export interface SubscriptionChangeResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT;
  data: {
    /** Whether the change was successful */
    success: boolean;

    /** The new tier if the change was successful */
    tier?: SubscriptionTier;

    /** Error message if the change failed */
    errorMsg?: string;
  };
}

/**
 * Sent for critical billing failures (payment lapse, account hold)
 */
export interface SubscriptionErrorMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SUBSCRIPTION_ERROR;
  data: {
    /** Error code */
    code: string;

    /** Error message */
    message: string;
  };
}

/** Union type of all subscription messages */
export type SubscriptionMessage =
  | SubscriptionStatusMessage
  | SubscriptionChangeRequestMessage
  | SubscriptionChangeResultMessage
  | SubscriptionErrorMessage;
