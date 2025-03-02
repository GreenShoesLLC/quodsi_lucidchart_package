// src/services/loggerService.ts
import { InvocationContext } from "@azure/functions";
import { getConfig } from '../config';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
    'debug': LogLevel.DEBUG,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN, 
    'error': LogLevel.ERROR,
    'none': LogLevel.NONE
};

/**
 * Logger service that respects configured log level from environment
 */
export class Logger {
    protected context: string;
    private configuredLevel: LogLevel;

    /**
     * Create a new logger with the specified context name
     * @param context A name or identifier for the logging context (e.g., class name)
     */
    constructor(context: string) {
        this.context = context;
        
        const config = getConfig();
        this.configuredLevel = LOG_LEVEL_MAP[config.logLevel?.toLowerCase()] ?? LogLevel.INFO;
    }

    /**
     * Log a debug message
     * @param message The message to log
     * @param data Optional data to log with the message
     */
    debug(message: string, data?: any): void {
        if (this.configuredLevel <= LogLevel.DEBUG) {
            console.debug(`[${this.context}] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Log an info message
     * @param message The message to log
     * @param data Optional data to log with the message
     */
    info(message: string, data?: any): void {
        if (this.configuredLevel <= LogLevel.INFO) {
            console.info(`[${this.context}] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Log a warning message
     * @param message The message to log
     * @param data Optional data to log with the message
     */
    warn(message: string, data?: any): void {
        if (this.configuredLevel <= LogLevel.WARN) {
            console.warn(`[${this.context}] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Log an error message
     * @param message The message to log
     * @param error Optional error object or data to log with the message
     */
    error(message: string, error?: any): void {
        if (this.configuredLevel <= LogLevel.ERROR) {
            console.error(`[${this.context}] ${message}`, error !== undefined ? error : '');
        }
    }
}

/**
 * Extended logger for Azure Functions that uses the context.log methods
 */
export class FunctionLogger extends Logger {
    private functionContext?: InvocationContext;

    /**
     * Create a new function logger
     * @param context A name or identifier for the logging context
     * @param functionContext The Azure Function invocation context
     */
    constructor(context: string, functionContext?: InvocationContext) {
        super(context);
        this.functionContext = functionContext;
    }

    /**
     * Log a debug message to the function context and console
     * @param message The message to log
     * @param data Optional data to log with the message
     */
    debug(message: string, data?: any): void {
        super.debug(message, data);
        if (this.functionContext) {
            const logMessage = `[${this.functionContext.invocationId}][${this.context}] ${message}`;
            this.functionContext.debug(logMessage, data);
        }
    }

    /**
     * Log an info message to the function context and console
     * @param message The message to log
     * @param data Optional data to log with the message
     */
    info(message: string, data?: any): void {
        super.info(message, data);
        if (this.functionContext) {
            const logMessage = `[${this.functionContext.invocationId}][${this.context}] ${message}`;
            this.functionContext.info(logMessage, data);
        }
    }

    /**
     * Log a warning message to the function context and console
     * @param message The message to log
     * @param data Optional data to log with the message
     */
    warn(message: string, data?: any): void {
        super.warn(message, data);
        if (this.functionContext) {
            const logMessage = `[${this.functionContext.invocationId}][${this.context}] ${message}`;
            this.functionContext.warn(logMessage, data);
        }
    }

    /**
     * Log an error message to the function context and console
     * @param message The message to log
     * @param error Optional error object or data to log with the message
     */
    error(message: string, error?: any): void {
        super.error(message, error);
        if (this.functionContext) {
            const logMessage = `[${this.functionContext.invocationId}][${this.context}] ${message}`;
            this.functionContext.error(logMessage, error);
        }
    }

    /**
     * Creates a child logger with additional context information
     * @param childContext Additional context information
     * @returns A new FunctionLogger with the combined context
     */
    child(childContext: string): FunctionLogger {
        return new FunctionLogger(`${this.context}:${childContext}`, this.functionContext);
    }
}
