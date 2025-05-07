// Export the router singleton

import { MessageRouter } from './MessageRouter';
export { MessageRouter } from './MessageRouter';

// Export types from the new location
export { PanelRole, Channel, AuthState, SubscriptionState, LogEntry } from './types';
export { RoutablePanel } from './RoutablePanel';

// Re-export handlers for direct access
export { MessageHandlers, AuthHandler, SubscriptionHandler } from './handlers';

// Export the singleton instance
export const router = MessageRouter.getInstance();

/**
 * Initialize the messaging system
 * 
 * This function should be called during application startup
 * to ensure the router singleton is created.
 * 
 * @param enableLogging Whether to enable debug logging
 */
export function initializeMessaging(enableLogging: boolean = true): void {
  router.setLogging(enableLogging);
  console.log('[Messaging] System initialized');
}
