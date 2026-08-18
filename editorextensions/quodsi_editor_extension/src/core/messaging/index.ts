// Export the router singleton

import { MessageRouter } from './MessageRouter';
export { MessageRouter } from './MessageRouter';
import { getLogger } from '@quodsi/lucid-shared';

// Export types from the new location
export { PanelRole, Channel, LogEntry } from './types';
export { RoutablePanel } from './RoutablePanel';

// Re-export handlers for direct access
export { MessageHandlers } from './handlers';

const log = getLogger('Messaging');

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
  log.debug('System initialized');
}
