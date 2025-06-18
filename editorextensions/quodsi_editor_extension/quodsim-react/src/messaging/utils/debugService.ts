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
      if (debugService.isLoggingEnabled && !debugService.disabledComponents.has(componentName)) {
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
      if (debugService.isLoggingEnabled && !debugService.disabledComponents.has(componentName)) {
        console.debug(`[REACT][${componentName}][DEBUG] ${message}`, ...args);
      }
    }
  }),

  /**
   * Whether logging is enabled
   */
  isLoggingEnabled: false,
  
  /**
   * Set of components with disabled logging
   * Pre-populated with commonly noisy components
   */
  disabledComponents: new Set<string>([
    'useSilentAuth',      // Silent auth checks can be very verbose
    'useAuthState',       // Auth state checks happen frequently
    'MessageProvider',    // Message provider can be chatty with every message
    'ElementOpsMapper',
    'AuthMapper',
    'useSendMessage',
    'RxMessageHandlers',
    'AuthStatusHandler',
    'ReactAppReadyEffects',
    'MessageListenerEffect',
    'InitializationEffects',
    'AuthEffects',
    'AuthPanel',
    'LucidAppNew',
    'MessageMapper',
    'AuthStorageService',
    'useModelPanel',
    'SelectionMapper',
    'SelectionSlice'
    // ModelOpsMapper intentionally NOT disabled so we can see conversion logs
    // Add more components here as needed
  ]),
  
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
  },
  
  /**
   * Disable logging for a specific component
   */
  disableComponent(componentName: string): void {
    this.disabledComponents.add(componentName);
    console.log(`[REACT][DebugService] Logging disabled for component: ${componentName}`);
  },
  
  /**
   * Enable logging for a specific component
   */
  enableComponent(componentName: string): void {
    this.disabledComponents.delete(componentName);
    console.log(`[REACT][DebugService] Logging enabled for component: ${componentName}`);
  },
  
  /**
   * Check if a component has logging disabled
   */
  isComponentDisabled(componentName: string): boolean {
    return this.disabledComponents.has(componentName);
  },
  
  /**
   * List all disabled components
   */
  listDisabledComponents(): string[] {
    return Array.from(this.disabledComponents);
  }
};
