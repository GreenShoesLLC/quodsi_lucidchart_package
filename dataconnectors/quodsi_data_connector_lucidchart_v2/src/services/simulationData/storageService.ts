// services/simulationData/storageService.ts
import { AzureStorageService } from '../azureStorageService';

// Create a single instance of the storage service
let storageService: AzureStorageService | null = null;
let isVerboseLogging = true;

/**
 * Set whether verbose logging is enabled
 */
export function setVerboseLogging(verbose: boolean): void {
    isVerboseLogging = verbose;
}

/**
 * Conditionally logs based on verbosity setting
 */
export function conditionalLog(message: string, ...args: any[]): void {
    if (isVerboseLogging) {
        console.log(message, ...args);
    }
}

/**
 * Conditionally logs information based on verbosity setting
 */
export function conditionalInfo(message: string, ...args: any[]): void {
    if (isVerboseLogging) {
        console.info(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 */
export function conditionalError(message: string, ...args: any[]): void {
    console.error(message, ...args);
}

/**
 * Warning logs are always displayed regardless of verbosity setting
 */
export function conditionalWarn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
}

/**
 * Initialize the storage service with a connection string
 * @param connectionString Azure Storage connection string
 * @returns The initialized storage service
 */
export function initializeStorageService(connectionString: string): AzureStorageService {
    if (!storageService) {
        storageService = new AzureStorageService(connectionString);
    }
    return storageService;
}

/**
 * Get the initialized storage service
 * @returns The storage service instance
 * @throws Error if the storage service is not initialized
 */
export function getStorageService(): AzureStorageService {
    if (!storageService) {
        throw new Error('Storage service not initialized. Call initializeStorageService first.');
    }
    return storageService;
}
