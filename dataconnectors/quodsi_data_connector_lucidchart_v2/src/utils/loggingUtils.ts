// src/utils/loggingUtils.ts

/**
 * Conditionally logs based on verbosity setting
 * @param message Message to log
 * @param verbose Whether to log the message
 * @param args Additional arguments to log
 */
export function conditionalLog(message: string, verbose: boolean, ...args: any[]) {
    if (verbose) {
        console.log(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 * @param message Error message to log
 * @param args Additional arguments to log
 */
export function conditionalError(message: string, ...args: any[]) {
    console.error(message, ...args);
}
