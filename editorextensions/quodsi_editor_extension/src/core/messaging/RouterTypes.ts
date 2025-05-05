import { EnvelopeBase, QuodsiUserInfo, SubscriptionTier, SubscriptionStatus } from '@quodsi/shared';
import { RoutablePanel } from './RoutablePanel';

/**
 * Panel role in the application
 */
export type PanelRole = 'auth' | 'model';

/**
 * Channel information maintained by the router
 */
export interface Channel {
  panel?: RoutablePanel;
  ready: boolean;
  queue: EnvelopeBase[];
}

/**
 * Authentication state structure
 */
export interface AuthState {
  isAuthenticated: boolean;
  user?: QuodsiUserInfo;
}

/**
 * Subscription state structure
 */
export interface SubscriptionState {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  expiresAt?: string;
  featureFlags?: Record<string, boolean>;
}

/**
 * Debug log entry
 */
export interface LogEntry {
  timestamp: Date;
  message: string;
}
