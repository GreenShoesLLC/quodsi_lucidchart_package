// shared/src/core/logging/QuodsiLogger.ts

export abstract class QuodsiLogger {
    private static readonly instanceMap = new Map<string, boolean>();
    protected abstract readonly LOG_PREFIX: string;
    private loggingEnabled: boolean = false;

    // No initialization in constructor since we can't access LOG_PREFIX
    constructor() {
    }

    public setLogging(enabled: boolean): void {
        // Initialize on first use if needed
        if (!QuodsiLogger.instanceMap.has(this.LOG_PREFIX)) {
            QuodsiLogger.instanceMap.set(this.LOG_PREFIX, enabled);
        } else {
            QuodsiLogger.instanceMap.set(this.LOG_PREFIX, enabled);
        }
        this.loggingEnabled = enabled;

        if (enabled) {
            this.log(`Logging enabled`);
        }
    }

    protected isLoggingEnabled(): boolean {
        // Initialize as false if not yet set
        if (!QuodsiLogger.instanceMap.has(this.LOG_PREFIX)) {
            QuodsiLogger.instanceMap.set(this.LOG_PREFIX, false);
            this.loggingEnabled = false;
        }
        return this.loggingEnabled;
    }

    protected log(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.log(`${this.LOG_PREFIX} ${message}`, ...args);
        }
    }

    protected logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${this.LOG_PREFIX} ${message}`, ...args);
        }
    }

    protected logWarning(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.warn(`${this.LOG_PREFIX} ${message}`, ...args);
        }
    }

    protected logDebug(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.debug(`${this.LOG_PREFIX} ${message}`, ...args);
        }
    }
}