/**
 * Subscription State Slice
 * Manages subscription tier, status, and feature access
 */

import { SubscriptionStatus, SubscriptionTier } from './types';

// State shape
export interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt?: string;
  features?: string[];
  lastUpdated?: number;
}

// Initial state
export const initialSubscriptionState: SubscriptionState = {
  tier: SubscriptionTier.FREE,
  status: SubscriptionStatus.ACTIVE,
  expiresAt: undefined,
  features: [],
  lastUpdated: undefined,
};

// Action types
export type SubscriptionAction = 
  | { type: 'SUBSCRIPTION_STATUS_UPDATE'; tier: SubscriptionTier; status: SubscriptionStatus; expiresAt?: string; features?: string[] }
  | { type: 'SUBSCRIPTION_ERROR'; error: string };

// Reducer
export function subscriptionReducer(state: SubscriptionState = initialSubscriptionState, action: SubscriptionAction): SubscriptionState {
  switch (action.type) {
    case 'SUBSCRIPTION_STATUS_UPDATE':
      return {
        ...state,
        tier: action.tier,
        status: action.status,
        expiresAt: action.expiresAt,
        features: action.features,
        lastUpdated: Date.now(),
      };
    case 'SUBSCRIPTION_ERROR':
      return {
        ...state,
        status: SubscriptionStatus.ERROR,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}
