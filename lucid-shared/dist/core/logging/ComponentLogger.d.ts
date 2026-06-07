/**
 * ComponentLogger - A simple logging utility that allows enabling/disabling logs per component
 */
export declare class ComponentLogger {
    private static readonly enabledPrefixes;
    /**
     * Enable or disable logging for a specific component prefix
     * @param prefix The component prefix to configure (e.g., '[ComponentName]')
     * @param enabled Whether logging should be enabled for this component
     */
    static setEnabled(prefix: string, enabled: boolean): void;
    /**
     * Check if logging is enabled for a specific component prefix
     * @param prefix The component prefix to check
     * @returns True if logging is enabled for this prefix, false otherwise
     */
    static isEnabled(prefix: string): boolean;
    /**
     * Log a message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The message to log
     * @param args Additional arguments to log
     */
    static log(prefix: string, message: string, ...args: any[]): void;
    /**
     * Log an error message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The error message to log
     * @param args Additional arguments to log
     */
    static error(prefix: string, message: string, ...args: any[]): void;
    /**
     * Log a warning message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The warning message to log
     * @param args Additional arguments to log
     */
    static warn(prefix: string, message: string, ...args: any[]): void;
    /**
     * Log a debug message if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param message The debug message to log
     * @param args Additional arguments to log
     */
    static debug(prefix: string, message: string, ...args: any[]): void;
    /**
     * Start a new logging group if logging is enabled for the specified component
     * @param prefix The component prefix
     * @param label The label for the group
     * @param args Additional arguments to log
     */
    static group(prefix: string, label: string, ...args: any[]): void;
    /**
     * End a logging group if logging is enabled for the specified component
     * @param prefix The component prefix
     */
    static groupEnd(prefix: string): void;
}
//# sourceMappingURL=ComponentLogger.d.ts.map