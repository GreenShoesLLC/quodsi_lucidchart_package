/**
 * ComponentLogger - A simple logging utility that allows enabling/disabling logs per component
 */
export class ComponentLogger {
    private static readonly enabledPrefixes = new Map<string, boolean>();

    /**
     * Enable or disable logging for a specific component prefix
     * @param prefix The component prefix to configure (e.g., '[ComponentName]')
     * @param enabled Whether logging should be enabled for this component
     */
    public static setEnabled(prefix: string, enabled: boolean): void {
        ComponentLogger.enabledPrefixes.set(prefix, enabled);
        if (enabled) {
            console.log(`${prefix} Logging enabled`);
        }
    }

    /**
     * Check if logging is enabled for a specific component prefix
     * @param prefix The component prefix to check
     * @returns True if logging is enabled for this prefix, false otherwise
     */
    public static isEnabled(prefix: string): boolean {
        return ComponentLogger.enabledPrefixes.get(prefix) || false;
    }

    /**
     * Log a message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The message to log
     * @param args Additional arguments to log
     */
    public static log(prefix: string, message: string, ...args: any[]): void {
        if (ComponentLogger.isEnabled(prefix)) {
            console.log(`${prefix} ${message}`, ...args);
        }
    }

    /**
     * Log an error message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The error message to log
     * @param args Additional arguments to log
     */
    public static error(prefix: string, message: string, ...args: any[]): void {
        if (ComponentLogger.isEnabled(prefix)) {
            console.error(`${prefix} ${message}`, ...args);
        }
    }

    /**
     * Log a warning message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The warning message to log
     * @param args Additional arguments to log
     */
    public static warn(prefix: string, message: string, ...args: any[]): void {
        if (ComponentLogger.isEnabled(prefix)) {
            console.warn(`${prefix} ${message}`, ...args);
        }
    }

    /**
     * Log a debug message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The debug message to log
     * @param args Additional arguments to log
     */
    public static debug(prefix: string, message: string, ...args: any[]): void {
        if (ComponentLogger.isEnabled(prefix)) {
            console.debug(`${prefix} ${message}`, ...args);
        }
    }

    /**
     * Start a new logging group if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param label The label for the group
     * @param args Additional arguments to log
     */
    public static group(prefix: string, label: string, ...args: any[]): void {
        if (ComponentLogger.isEnabled(prefix)) {
            console.group(`${prefix} ${label}`, ...args);
        }
    }

    /**
     * End a logging group if logging is enabled for the specified component
     * @param prefix The component prefix
     */
    public static groupEnd(prefix: string): void {
        if (ComponentLogger.isEnabled(prefix)) {
            console.groupEnd();
        }
    }
}