import { getLogger } from '@quodsi/lucid-shared';

const logger = getLogger('MessagingInit');

/**
 * Configuration options for initializing the messaging system
 */
export interface MessagingInitOptions {
  /** Enable debug logging */
  enableLogging?: boolean;
  
  /** Enable DevTools integration */
  enableDevTools?: boolean;
  
  /** Custom debug prefix for log messages */
  logPrefix?: string;
}

/**
 * Initialize the messaging system
 * 
 * This function should be called during application startup to:
 * - Enable debug logging if in development mode
 * - Register any global event listeners
 * - Perform any other initialization tasks
 * 
 * @param options Optional configuration options
 * @returns A cleanup function to call when the app unmounts
 */
export function initializeMessaging(options?: MessagingInitOptions) {
  // Configure default options
  const config = {
    enableLogging: import.meta.env.DEV,
    enableDevTools: import.meta.env.DEV,
    logPrefix: 'Quodsi',
    ...options
  };
  
  // Logging itself is already configured statically (see index.tsx's
  // configureLogger call); this flag now only gates the one-time startup
  // message below.
  if (config.enableLogging) {
    logger.debug(`Messaging system initialized with logging enabled`);
  }

  // Enable DevTools integration if requested
  if (config.enableDevTools && typeof window !== 'undefined') {
    // Expose messaging system to window for debugging.
    // Runtime log-level control lives on window.QUODSI_DEBUG
    // (see @quodsi/lucid-shared's installDebugGlobal, called from index.tsx).
    (window as any).__QUODSI_DEBUG = {
      messaging: {
        // Add any other debugging utilities here
      }
    };
    logger.debug('DevTools integration enabled');
  }

  // Return cleanup function
  return () => {
    // Perform any cleanup needed when the app unmounts
    logger.debug('Messaging system cleanup');

    // Remove DevTools integration
    if (config.enableDevTools && typeof window !== 'undefined') {
      delete (window as any).__QUODSI_DEBUG;
    }
  };
}
