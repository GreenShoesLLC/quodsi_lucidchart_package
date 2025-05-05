import { debugService } from './utils/debugService';

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
    enableLogging: process.env.NODE_ENV === 'development',
    enableDevTools: process.env.NODE_ENV === 'development',
    logPrefix: 'Quodsi',
    ...options
  };
  
  // Enable debug logging if requested
  if (config.enableLogging) {
    debugService.enableLogging();
    debugService.log(`Messaging system initialized with logging enabled`);
  }
  
  // Enable DevTools integration if requested
  if (config.enableDevTools && typeof window !== 'undefined') {
    // Expose messaging system to window for debugging
    (window as any).__QUODSI_DEBUG = {
      messaging: {
        debugService,
        // Add any other debugging utilities here
      }
    };
    debugService.log('DevTools integration enabled');
  }
  
  // Return cleanup function
  return () => {
    // Perform any cleanup needed when the app unmounts
    debugService.log('Messaging system cleanup');
    
    // Remove DevTools integration
    if (config.enableDevTools && typeof window !== 'undefined') {
      delete (window as any).__QUODSI_DEBUG;
    }
  };
}
