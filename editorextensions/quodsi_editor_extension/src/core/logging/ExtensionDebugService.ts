/**
 * ExtensionDebugService - Centralized logging service for the Quodsi extension
 * 
 * This service provides component-specific logging with granular control over
 * which components output to the console. It mirrors the React app's debug service
 * for consistency across the codebase.
 * 
 * Usage:
 *   import { ExtensionDebugService } from '@core/logging/ExtensionDebugService';
 *   const debug = ExtensionDebugService.forComponent('MyComponent');
 *   debug.log('Something happened');
 *   debug.error('Something went wrong', error);
 * 
 * Global control (from browser console):
 *   window.QUODSI_EXT_DEBUG.enable()
 *   window.QUODSI_EXT_DEBUG.disable()
 *   window.QUODSI_EXT_DEBUG.enableComponent('MessageRouter')
 *   window.QUODSI_EXT_DEBUG.disableComponent('MessageRouter')
 *   window.QUODSI_EXT_DEBUG.listComponents()
 */

export interface ComponentLogger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

export class ExtensionDebugService {
  private static instance: ExtensionDebugService;
  private globalEnabled: boolean = true;
  private componentStates: Map<string, boolean> = new Map();
  private componentLoggers: Map<string, ComponentLogger> = new Map();

  // Components that are typically noisy - comment/uncomment to control console output
  private readonly noisyComponents = [
    // Core messaging and routing (usually very verbose)
    'MessageRouter',
    'ChannelManager',
    
    // Model management (can be verbose during operations)
    'ModelManager',
    
    // Panel management
    'RightDockPanel',
    
    // Data builders (verbose during selection changes)
    'ReferenceDataBuilder',
    'ItemDataBuilder',
    
    // Model operations handler
    'ModelOpsHandler',

    // Storage and API
    'StorageAdapter',
    'LucidApiService'
  ];

  private constructor() {
    // Initialize noisy components as disabled by default
    this.noisyComponents.forEach(component => {
      this.componentStates.set(component, false);
    });

    // Expose control methods through window object
    if (typeof window !== 'undefined') {
      (window as any).QUODSI_EXT_DEBUG = {
        enable: () => this.enable(),
        disable: () => this.disable(),
        enableComponent: (name: string) => this.enableComponent(name),
        disableComponent: (name: string) => this.disableComponent(name),
        enableAll: () => this.enableAll(),
        disableAll: () => this.disableAll(),
        listComponents: () => this.listComponents(),
        status: () => this.status(),
        help: () => this.help()
      };
    }
  }

  public static getInstance(): ExtensionDebugService {
    if (!ExtensionDebugService.instance) {
      ExtensionDebugService.instance = new ExtensionDebugService();
    }
    return ExtensionDebugService.instance;
  }

  /**
   * Get a logger for a specific component
   */
  public static forComponent(componentName: string): ComponentLogger {
    const instance = ExtensionDebugService.getInstance();
    return instance.getComponentLogger(componentName);
  }

  private getComponentLogger(componentName: string): ComponentLogger {
    if (!this.componentLoggers.has(componentName)) {
      const logger = this.createComponentLogger(componentName);
      this.componentLoggers.set(componentName, logger);
      
      // Set default state if not already set
      if (!this.componentStates.has(componentName)) {
        this.componentStates.set(componentName, true);
      }
    }
    
    return this.componentLoggers.get(componentName)!;
  }

  private createComponentLogger(componentName: string): ComponentLogger {
    const prefix = `[${componentName}]`;
    
    const shouldLog = () => {
      return this.globalEnabled && (this.componentStates.get(componentName) ?? true);
    };

    return {
      log: (...args: any[]) => {
        if (shouldLog()) {
          console.log(prefix, ...args);
        }
      },
      warn: (...args: any[]) => {
        if (shouldLog()) {
          console.warn(prefix, ...args);
        }
      },
      error: (...args: any[]) => {
        if (shouldLog()) {
          console.error(prefix, ...args);
        }
      },
      debug: (...args: any[]) => {
        if (shouldLog()) {
          console.debug(prefix, ...args);
        }
      },
      info: (...args: any[]) => {
        if (shouldLog()) {
          console.info(prefix, ...args);
        }
      }
    };
  }

  /**
   * Enable global logging
   */
  public enable(): void {
    this.globalEnabled = true;
    console.log('[ExtensionDebugService] Global logging enabled');
  }

  /**
   * Disable global logging
   */
  public disable(): void {
    this.globalEnabled = false;
    console.log('[ExtensionDebugService] Global logging disabled');
  }

  /**
   * Enable logging for a specific component
   */
  public enableComponent(componentName: string): void {
    this.componentStates.set(componentName, true);
    console.log(`[ExtensionDebugService] Enabled logging for: ${componentName}`);
  }

  /**
   * Disable logging for a specific component
   */
  public disableComponent(componentName: string): void {
    this.componentStates.set(componentName, false);
    console.log(`[ExtensionDebugService] Disabled logging for: ${componentName}`);
  }

  /**
   * Enable all components
   */
  public enableAll(): void {
    this.componentStates.forEach((_, key) => {
      this.componentStates.set(key, true);
    });
    console.log('[ExtensionDebugService] Enabled all components');
  }

  /**
   * Disable all components
   */
  public disableAll(): void {
    this.componentStates.forEach((_, key) => {
      this.componentStates.set(key, false);
    });
    console.log('[ExtensionDebugService] Disabled all components');
  }

  /**
   * List all registered components and their states
   */
  public listComponents(): void {
    console.log('[ExtensionDebugService] Component states:');
    const sortedComponents = Array.from(this.componentStates.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedComponents.forEach(([name, enabled]) => {
      const status = enabled ? '✓' : '✗';
      const noisy = this.noisyComponents.includes(name) ? ' (noisy)' : '';
      console.log(`  ${status} ${name}${noisy}`);
    });
  }

  /**
   * Show current status
   */
  public status(): void {
    console.log('[ExtensionDebugService] Status:');
    console.log(`  Global: ${this.globalEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  Total components: ${this.componentStates.size}`);
    
    const enabledCount = Array.from(this.componentStates.values())
      .filter(enabled => enabled).length;
    console.log(`  Enabled components: ${enabledCount}`);
    console.log(`  Disabled components: ${this.componentStates.size - enabledCount}`);
  }

  /**
   * Show help information
   */
  public help(): void {
    console.log('[ExtensionDebugService] Available commands:');
    console.log('  QUODSI_EXT_DEBUG.enable()                 - Enable global logging');
    console.log('  QUODSI_EXT_DEBUG.disable()                - Disable global logging');
    console.log('  QUODSI_EXT_DEBUG.enableComponent(name)    - Enable specific component');
    console.log('  QUODSI_EXT_DEBUG.disableComponent(name)   - Disable specific component');
    console.log('  QUODSI_EXT_DEBUG.enableAll()              - Enable all components');
    console.log('  QUODSI_EXT_DEBUG.disableAll()             - Disable all components');
    console.log('  QUODSI_EXT_DEBUG.listComponents()         - List all components');
    console.log('  QUODSI_EXT_DEBUG.status()                 - Show current status');
    console.log('  QUODSI_EXT_DEBUG.help()                   - Show this help');
  }
}

// Export singleton instance for convenience
export const extensionDebug = ExtensionDebugService.getInstance();