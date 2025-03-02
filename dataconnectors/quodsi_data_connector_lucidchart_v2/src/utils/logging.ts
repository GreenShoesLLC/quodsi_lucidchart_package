// logging.ts - Optimized for Azure Functions context

import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";

/**
 * Logger for Azure Functions environment - specifically for data connector actions
 */
export class ActionLogger {
    private prefix: string;
    private verbose: boolean;
    private action: DataConnectorAsynchronousAction | null;

    constructor(prefix: string = '', verbose: boolean = true, action: DataConnectorAsynchronousAction | null = null) {
        this.prefix = prefix;
        this.verbose = verbose;
        this.action = action;
    }

    /**
     * Set the action for context access
     */
    setAction(action: DataConnectorAsynchronousAction): void {
        this.action = action;
    }

    /**
     * Set verbosity level
     */
    setVerbose(verbose: boolean): void {
        this.verbose = verbose;
    }

    /**
     * Set prefix for log messages
     */
    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    /**
     * Log information if verbose logging is enabled
     * Uses global.context if available (for Azure Functions)
     */
    info(message: string, ...args: any[]): void {
        if (this.verbose) {
            const formattedMessage = this.prefix ? `${this.prefix} ${message}` : message;

            // Attempt to use global.context if available (for Azure Functions)
            if (global && global.context && typeof global.context.log === 'function') {
                if (args.length > 0) {
                    try {
                        global.context.log(formattedMessage, ...args);
                    } catch (e) {
                        // Fallback if args can't be properly serialized
                        global.context.log(`${formattedMessage} ${JSON.stringify(args)}`);
                    }
                } else {
                    global.context.log(formattedMessage);
                }
                return;
            }

            // Always log to console as a fallback
            console.log(formattedMessage, ...args);
        }
    }

    /**
     * Log warnings (always shown regardless of verbose setting)
     */
    warn(message: string, ...args: any[]): void {
        const formattedMessage = this.prefix ? `${this.prefix} [WARN] ${message}` : `[WARN] ${message}`;

        // Attempt to use global.context if available
        if (global && global.context && typeof global.context.log === 'function') {
            if (args.length > 0) {
                try {
                    global.context.log.warn(formattedMessage, ...args);
                } catch (e) {
                    // Fallback
                    global.context.log.warn(`${formattedMessage} ${JSON.stringify(args)}`);
                }
            } else {
                global.context.log.warn(formattedMessage);
            }
            return;
        }

        // Always log to console as a fallback
        console.warn(formattedMessage, ...args);
    }

    /**
     * Log errors (always shown regardless of verbose setting)
     */
    error(message: string, ...args: any[]): void {
        const formattedMessage = this.prefix ? `${this.prefix} [ERROR] ${message}` : `[ERROR] ${message}`;

        // Attempt to use global.context if available
        if (global && global.context && typeof global.context.log === 'function') {
            if (args.length > 0) {
                try {
                    global.context.log.error(formattedMessage, ...args);
                } catch (e) {
                    // Fallback
                    global.context.log.error(`${formattedMessage} ${JSON.stringify(args)}`);
                }
            } else {
                global.context.log.error(formattedMessage);
            }
            return;
        }

        // Always log to console as a fallback
        console.error(formattedMessage, ...args);
    }

    /**
     * Create a child logger with a new prefix but inheriting verbosity
     */
    child(childPrefix: string): ActionLogger {
        const fullPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
        return new ActionLogger(fullPrefix, this.verbose, this.action);
    }
}

/**
 * Factory function to create a logger for data connector actions
 */
export function createActionLogger(
    action: DataConnectorAsynchronousAction,
    prefix: string = '',
    verbose: boolean = true
): ActionLogger {
    return new ActionLogger(prefix, verbose, action);
}