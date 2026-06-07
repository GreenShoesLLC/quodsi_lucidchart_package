export declare abstract class QuodsiLogger {
    private static readonly instanceMap;
    protected abstract readonly LOG_PREFIX: string;
    private loggingEnabled;
    constructor();
    setLogging(enabled: boolean): void;
    protected isLoggingEnabled(): boolean;
    protected log(message: string, ...args: any[]): void;
    protected logError(message: string, ...args: any[]): void;
    protected logWarning(message: string, ...args: any[]): void;
    protected logDebug(message: string, ...args: any[]): void;
}
//# sourceMappingURL=QuodsiLogger.d.ts.map