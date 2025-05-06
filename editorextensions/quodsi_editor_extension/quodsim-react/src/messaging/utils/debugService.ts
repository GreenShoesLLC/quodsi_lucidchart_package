/**
 * Debug service for the messaging system
 * Provides centralized logging capabilities with
 * conditional execution based on environment
 */
export const debugService = {
  /**
   * Create a component-specific logger
   */
  forComponent: (componentName: string) => ({
    log: (message: string, ...args: any[]) => {
      if (debugService.isLoggingEnabled) {
        console.log(`[REACT][${componentName}] ${message}`, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[REACT][${componentName}][ERROR] ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[REACT][${componentName}][WARN] ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (debugService.isLoggingEnabled) {
        console.debug(`[REACT][${componentName}][DEBUG] ${message}`, ...args);
      }
    }
  }),

  /**
   * Whether logging is enabled
   */
  isLoggingEnabled: false,
  
  /**
   * Enable logging
   */
  enableLogging(): void {
    this.isLoggingEnabled = true;
    console.log('[REACT][DebugService] Logging enabled');
  },
  
  /**
   * Disable logging
   */
  disableLogging(): void {
    this.isLoggingEnabled = false;
  },
  
  /**
   * Log a message if logging is enabled
   */
  log(message: string, ...args: any[]): void {
    if (this.isLoggingEnabled) {
      console.log(`[REACT][DEBUG] ${message}`, ...args);
    }
  },
  
  /**
   * Log an error message (always displayed)
   */
  error(message: string, ...args: any[]): void {
    console.error(`[REACT][ERROR] ${message}`, ...args);
  },
  
  /**
   * Log a warning message (always displayed)
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[REACT][WARN] ${message}`, ...args);
  },
  
  /**
   * Log debugging information if logging is enabled
   */
  debug(message: string, ...args: any[]): void {
    if (this.isLoggingEnabled) {
      console.debug(`[REACT][DEBUG] ${message}`, ...args);
    }
  },
  
  /**
   * Group related log messages
   */
  group(name: string): void {
    if (this.isLoggingEnabled) {
      console.group(`[REACT][GROUP] ${name}`);
    }
  },
  
  /**
   * End a log group
   */
  groupEnd(): void {
    if (this.isLoggingEnabled) {
      console.groupEnd();
    }
  }
};
