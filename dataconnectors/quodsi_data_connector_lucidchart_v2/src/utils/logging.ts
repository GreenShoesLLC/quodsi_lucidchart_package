// logging.ts - Optimized for Azure Functions context

import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { LoggingLevel } from "./loggingLevels";

/**
 * Logger for Azure Functions environment - specifically for data connector actions
 */
export class ActionLogger {
    private prefix: string;
    private loggingLevel: LoggingLevel;
    private action: DataConnectorAsynchronousAction | null;

    constructor(
        prefix: string = '', 
        loggingLevel: LoggingLevel = LoggingLevel.NORMAL, 
        action: DataConnectorAsynchronousAction | null = null
    ) {
        this.prefix = prefix;
        this.loggingLevel = loggingLevel;
        this.action = action;
    }

    /**
     * Set the action for context access
     */
    setAction(action: DataConnectorAsynchronousAction): void {
        this.action = action;
    }

    /**
     * Set logging level
     */
    setLoggingLevel(level: LoggingLevel): void {
        this.loggingLevel = level;
    }

    /**
     * Set prefix for log messages
     */
    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    /**
     * Check if logging should occur at the specified level
     */
    private shouldLog(level: LoggingLevel): boolean {
        return this.loggingLevel >= level;
    }

    /**
     * Log debug information (only in VERBOSE mode)
     */
    debug(message: string, ...args: any[]): void {
        if (this.shouldLog(LoggingLevel.VERBOSE)) {
            const formattedMessage = this.prefix ? `${this.prefix} [DEBUG] ${message}` : `[DEBUG] ${message}`;
            this.logToAvailableTarget(formattedMessage, 'debug', ...args);
        }
    }

    /**
     * Log information (NORMAL level and above)
     */
    info(message: string, ...args: any[]): void {
        if (this.shouldLog(LoggingLevel.NORMAL)) {
            const formattedMessage = this.prefix ? `${this.prefix} ${message}` : message;
            this.logToAvailableTarget(formattedMessage, 'info', ...args);
        }
    }

    /**
     * Log important information (MINIMAL level and above)
     * For start/end of processes and important state changes
     */
    important(message: string, ...args: any[]): void {
        if (this.shouldLog(LoggingLevel.MINIMAL)) {
            const formattedMessage = this.prefix ? `${this.prefix} [IMPORTANT] ${message}` : `[IMPORTANT] ${message}`;
            this.logToAvailableTarget(formattedMessage, 'info', ...args);
        }
    }

    /**
     * Log warnings (ERROR level and above)
     */
    warn(message: string, ...args: any[]): void {
        if (this.shouldLog(LoggingLevel.ERROR)) {
            const formattedMessage = this.prefix ? `${this.prefix} [WARN] ${message}` : `[WARN] ${message}`;
            this.logToAvailableTarget(formattedMessage, 'warn', ...args);
        }
    }

    /**
     * Log errors (ERROR level and above, never suppressed)
     */
    error(message: string, ...args: any[]): void {
        if (this.shouldLog(LoggingLevel.ERROR)) {
            const formattedMessage = this.prefix ? `${this.prefix} [ERROR] ${message}` : `[ERROR] ${message}`;
            this.logToAvailableTarget(formattedMessage, 'error', ...args);
        }
    }

    /**
     * Helper method to log to the appropriate target
     */
    private logToAvailableTarget(formattedMessage: string, level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
        // Attempt to use global.context if available (for Azure Functions)
        if (global && global.context && typeof global.context.log === 'function') {
            if (args.length > 0) {
                try {
                    if (level === 'warn' && global.context.log.warn) {
                        global.context.log.warn(formattedMessage, ...args);
                    } else if (level === 'error' && global.context.log.error) {
                        global.context.log.error(formattedMessage, ...args);
                    } else {
                        global.context.log(formattedMessage, ...args);
                    }
                } catch (e) {
                    // Fallback if args can't be properly serialized
                    if (level === 'warn' && global.context.log.warn) {
                        global.context.log.warn(`${formattedMessage} ${JSON.stringify(args)}`);
                    } else if (level === 'error' && global.context.log.error) {
                        global.context.log.error(`${formattedMessage} ${JSON.stringify(args)}`);
                    } else {
                        global.context.log(`${formattedMessage} ${JSON.stringify(args)}`);
                    }
                }
            } else {
                if (level === 'warn' && global.context.log.warn) {
                    global.context.log.warn(formattedMessage);
                } else if (level === 'error' && global.context.log.error) {
                    global.context.log.error(formattedMessage);
                } else {
                    global.context.log(formattedMessage);
                }
            }
            return;
        }

        // Console fallback
        switch (level) {
            case 'debug':
            case 'info':
                console.log(formattedMessage, ...args);
                break;
            case 'warn':
                console.warn(formattedMessage, ...args);
                break;
            case 'error':
                console.error(formattedMessage, ...args);
                break;
        }
    }

    /**
     * Create a child logger with a new prefix but inheriting logging level
     */
    child(childPrefix: string): ActionLogger {
        const fullPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
        return new ActionLogger(fullPrefix, this.loggingLevel, this.action);
    }

    /**
     * For backward compatibility - convert boolean verbose to logging level
     */
    setVerbose(verbose: boolean): void {
        this.loggingLevel = verbose ? LoggingLevel.VERBOSE : LoggingLevel.MINIMAL;
    }
}

/**
 * Factory function to create a logger for data connector actions
 */
export function createActionLogger(
    action: DataConnectorAsynchronousAction,
    prefix: string = '',
    loggingLevel: LoggingLevel | boolean = LoggingLevel.NORMAL
): ActionLogger {
    // Handle backward compatibility with boolean verbose
    if (typeof loggingLevel === 'boolean') {
        return new ActionLogger(prefix, loggingLevel ? LoggingLevel.VERBOSE : LoggingLevel.MINIMAL, action);
    }
    return new ActionLogger(prefix, loggingLevel, action);
}