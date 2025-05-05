/**
 * Debug service for the messaging system
 * Provides centralized logging capabilities with
 * conditional execution based on environment
 */
export const debugService = {
  /**
   * Whether logging is enabled
   */
  isLoggingEnabled: false,
  
  /**
   * Enable logging
   */
  enableLogging(): void {
    this.isLoggingEnabled = true;
    console.log('[DebugService] Logging enabled');
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
      console.log(`[Quodsi] ${message}`, ...args);
    }
  },
  
  /**
   * Log an error message (always displayed)
   */
  error(message: string, ...args: any[]): void {
    console.error(`[Quodsi] ${message}`, ...args);
  },
  
  /**
   * Log a warning message (always displayed)
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[Quodsi] ${message}`, ...args);
  },
  
  /**
   * Log debugging information if logging is enabled
   */
  debug(message: string, ...args: any[]): void {
    if (this.isLoggingEnabled) {
      console.debug(`[Quodsi] ${message}`, ...args);
    }
  },
  
  /**
   * Group related log messages
   */
  group(name: string): void {
    if (this.isLoggingEnabled) {
      console.group(`[Quodsi] ${name}`);
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
