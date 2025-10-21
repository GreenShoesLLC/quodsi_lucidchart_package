// src/services/azureStorageService.ts

import {
    BlobServiceClient,
    BlobUploadCommonResponse,
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential
} from '@azure/storage-blob';
import { retry, AttemptContext, PartialAttemptOptions } from '@lifeomic/attempt';
import { LoggingLevel } from '../utils/loggingLevels';

// Static logging level control for all instances of AzureStorageService
let storageLoggingLevel: LoggingLevel = LoggingLevel.NORMAL;

/**
 * Set the logging level for all storage service instances
 * @param level LoggingLevel enum value or boolean for backward compatibility
 */
export function setStorageVerboseLogging(level: LoggingLevel | boolean): void {
    if (typeof level === 'boolean') {
        // Convert boolean to logging level for backward compatibility
        storageLoggingLevel = level ? LoggingLevel.VERBOSE : LoggingLevel.MINIMAL;
    } else {
        storageLoggingLevel = level;
    }
}

/**
 * Debug logs - only for detailed debugging (VERBOSE level)
 */
function storageDebug(message: string, ...args: any[]): void {
    if (storageLoggingLevel >= LoggingLevel.VERBOSE) {
        console.log(`[StorageService][DEBUG] ${message}`, ...args);
    }
}

/**
 * Regular info logs - normal operational details (NORMAL level)
 */
function storageLog(message: string, ...args: any[]): void {
    if (storageLoggingLevel >= LoggingLevel.NORMAL) {
        console.log(message, ...args);
    }
}

/**
 * Important operational logs - major steps like initialization (MINIMAL level)
 */
function storageImportant(message: string, ...args: any[]): void {
    if (storageLoggingLevel >= LoggingLevel.MINIMAL) {
        console.log(`[StorageService][IMPORTANT] ${message}`, ...args);
    }
}

/**
 * Warning logs (ERROR level and above)
 */
function storageWarn(message: string, ...args: any[]): void {
    if (storageLoggingLevel >= LoggingLevel.ERROR) {
        console.warn(message, ...args);
    }
}

/**
 * Error logs are always displayed if ERROR level or above
 */
function storageError(message: string, ...args: any[]): void {
    if (storageLoggingLevel >= LoggingLevel.ERROR) {
        console.error(message, ...args);
    }
}

export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private connectionString: string;
    private blobRetryOptions: PartialAttemptOptions<string>;
    private existsRetryOptions: PartialAttemptOptions<boolean>;
    private uploadRetryOptions: PartialAttemptOptions<BlobUploadCommonResponse>;

    constructor(connectionString: string) {
        storageImportant('[AzureStorageService] Initializing service');
        this.connectionString = connectionString;
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        storageLog('[AzureStorageService] BlobServiceClient initialized:', {
            url: this.blobServiceClient.url,
            accountName: this.blobServiceClient.accountName
        });

        // Optimize exists check for speed
        this.existsRetryOptions = {
            maxAttempts: 2,
            initialDelay: 100,  // Start with shorter delay
            factor: 2,
            timeout: 3000,      // 3 second timeout
            handleError: async (error: any, context: AttemptContext) => {
                storageWarn('[AzureStorageService] Container check retry:', {
                    attempt: context.attemptNum,
                    error: error.message
                });
            }
        };

        // Optimize blob retrieval
        this.blobRetryOptions = {
            maxAttempts: 2,
            initialDelay: 200,
            factor: 2,
            timeout: 5000,     // 5 second timeout
            handleError: async (error: any, context: AttemptContext) => {
                storageWarn('[AzureStorageService] Blob retrieval retry:', {
                    attempt: context.attemptNum,
                    error: error.message
                });
            }
        };

        // Configure upload retry options
        this.uploadRetryOptions = {
            maxAttempts: 3,
            initialDelay: 200,
            factor: 2,
            timeout: 10000,     // 10 second timeout
            handleError: async (error: any, context: AttemptContext) => {
                storageWarn('[AzureStorageService] Upload retry:', {
                    attempt: context.attemptNum,
                    error: error.message
                });
            }
        };
    }

    async containerExists(containerName: string): Promise<boolean> {
        const startTime = Date.now();

        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);

            const exists = await retry(async () => {
                return await containerClient.exists();
            }, this.existsRetryOptions);

            storageLog('[AzureStorageService] Container check:', {
                containerName,
                exists,
                durationMs: Date.now() - startTime
            });

            return exists;
        } catch (error) {
            storageError('[AzureStorageService] Container check failed:', {
                containerName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return false;
        }
    }

    // Enhanced getBlobContent method with better logging and path checking
    async getBlobContent(containerName: string, blobName: string): Promise<string | null> {
        const startTime = Date.now();

        try {
            storageDebug('[AzureStorageService] Attempting to get blob:', {
                containerName,
                blobName,
                fullPath: `${containerName}/${blobName}`
            });

            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);

            // Check existence and get content in parallel if possible
            const exists = await blobClient.exists();

            if (!exists) {
                storageLog('[AzureStorageService] Blob not found:', {
                    containerName,
                    blobName
                });
                return null;
            }

            const properties = await blobClient.getProperties().catch(() => null);

            const content = await retry(async () => {
                const downloadStart = Date.now();
                const response = await blobClient.download();

                const content = await this.streamToBuffer(response.readableStreamBody!);
                storageDebug('[AzureStorageService] Blob download:', {
                    size: content.length,
                    downloadMs: Date.now() - downloadStart
                });

                return content.toString();
            }, this.blobRetryOptions);

            storageLog('[AzureStorageService] Blob retrieved successfully:', {
                containerName,
                blobName,
                contentLength: content.length,
                contentType: properties?.contentType,
                durationMs: Date.now() - startTime
            });

            return content;
        } catch (error) {
            storageError('[AzureStorageService] Blob retrieval failed:', {
                containerName,
                blobName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return null;
        }
    }

    async uploadBlobContent(
        containerName: string, 
        blobName: string, 
        content: string
    ): Promise<boolean> {
        const startTime = Date.now();

        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            
            // Ensure container exists
            if (!await containerClient.exists()) {
                await containerClient.create();
                storageImportant('[AzureStorageService] Container created:', { containerName });
            }

            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const contentBuffer = Buffer.from(content);

            const uploadResult = await retry(async () => {
                const uploadStart = Date.now();
                const result = await blockBlobClient.uploadData(contentBuffer, {
                    blobHTTPHeaders: {
                        blobContentType: 'application/json'
                    }
                });

                storageDebug('[AzureStorageService] Blob upload:', {
                    etag: result.etag,
                    uploadMs: Date.now() - uploadStart
                });

                return result;
            }, this.uploadRetryOptions);

            storageLog('[AzureStorageService] Upload completed:', {
                containerName,
                blobName,
                contentLength: content.length,
                durationMs: Date.now() - startTime,
                etag: uploadResult.etag
            });

            return true;
        } catch (error) {
            storageError('[AzureStorageService] Upload failed:', {
                containerName,
                blobName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return false;
        }
    }

    private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            readableStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
            readableStream.on('end', () => resolve(Buffer.concat(chunks)));
            readableStream.on('error', reject);
        });
    }
        /**
     * Checks if a specific blob exists in a container
     * @param containerName Container name
     * @param blobName Blob name/path
     * @returns Promise<boolean> True if the blob exists, false otherwise
     */
    async blobExists(containerName: string, blobName: string): Promise<boolean> {
        const startTime = Date.now();

        try {
            storageDebug('[AzureStorageService] Checking if blob exists:', {
                containerName, 
                blobName,
                fullPath: `${containerName}/${blobName}`
            });

            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            
            // Check if container exists first to avoid unnecessary errors
            const containerExists = await containerClient.exists();
            if (!containerExists) {
                storageLog('[AzureStorageService] Container does not exist:', { containerName });
                return false;
            }
            
            const blobClient = containerClient.getBlobClient(blobName);

            const exists = await retry(async () => {
                return await blobClient.exists();
            }, this.existsRetryOptions);

            storageLog('[AzureStorageService] Blob exists check:', {
                containerName,
                blobName,
                exists,
                durationMs: Date.now() - startTime
            });

            return exists;
        } catch (error) {
            storageError('[AzureStorageService] Blob exists check failed:', {
                containerName,
                blobName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return false;
        }
    }

    /**
     * List all containers in the storage account
     */
    async listContainers(): Promise<string[]> {
        const startTime = Date.now();
        const containers: string[] = [];

        try {
            storageLog('[AzureStorageService] Listing containers...');

            // List all containers
            for await (const container of this.blobServiceClient.listContainers()) {
                containers.push(container.name);
            }

            storageLog('[AzureStorageService] Listed containers:', {
                count: containers.length,
                durationMs: Date.now() - startTime
            });

            return containers;
        } catch (error) {
            storageError('[AzureStorageService] Failed to list containers:', {
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return [];
        }
    }

    /**
     * List blobs within a container with an optional prefix
     */
    async listBlobs(containerName: string, prefix?: string): Promise<string[]> {
        const startTime = Date.now();
        const blobs: string[] = [];

        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);

            // Check if container exists
            if (!await containerClient.exists()) {
                storageWarn('[AzureStorageService] Container does not exist:', {
                    containerName,
                    durationMs: Date.now() - startTime
                });
                return [];
            }

            storageDebug('[AzureStorageService] Listing blobs in container:', {
                containerName,
                prefix: prefix || '(none)'
            });

            // List blobs with optional prefix
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                blobs.push(blob.name);
            }

            storageLog('[AzureStorageService] Listed blobs:', {
                containerName,
                prefix: prefix || '(none)',
                count: blobs.length,
                durationMs: Date.now() - startTime
            });

            return blobs;
        } catch (error) {
            storageError('[AzureStorageService] Failed to list blobs:', {
                containerName,
                prefix: prefix || '(none)',
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return [];
        }
    }

    /**
     * Generate a time-limited SAS URL for blob download
     * @param containerName Container name
     * @param blobName Blob path/name
     * @param expiryMinutes Expiry time in minutes (default 30)
     * @returns Full blob URL with SAS token
     */
    async generateBlobSasUrl(
        containerName: string,
        blobName: string,
        expiryMinutes: number = 30
    ): Promise<string> {
        const startTime = Date.now();

        try {
            storageDebug('[AzureStorageService] Generating SAS URL:', {
                containerName,
                blobName,
                expiryMinutes
            });

            // Extract account name and key from connection string
            const accountNameMatch = this.connectionString.match(/AccountName=([^;]+)/);
            const accountKeyMatch = this.connectionString.match(/AccountKey=([^;]+)/);

            if (!accountNameMatch || !accountKeyMatch) {
                throw new Error('Failed to extract account credentials from connection string');
            }

            const accountName = accountNameMatch[1];
            const accountKey = accountKeyMatch[1];

            // Create shared key credential
            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

            // Set permissions (read only)
            const permissions = new BlobSASPermissions();
            permissions.read = true;

            // Calculate expiry time
            const now = new Date();
            const expiresOn = new Date(now.getTime() + expiryMinutes * 60 * 1000);

            // Generate SAS token (simple read-only, no content-disposition to avoid signature issues)
            const sasToken = generateBlobSASQueryParameters(
                {
                    containerName,
                    blobName,
                    permissions,
                    startsOn: now,
                    expiresOn
                },
                sharedKeyCredential
            ).toString();

            // Construct full URL (remove trailing slash from base URL to avoid double slashes)
            const baseUrl = this.blobServiceClient.url.replace(/\/+$/, '');
            const blobUrl = `${baseUrl}/${containerName}/${blobName}?${sasToken}`;

            storageLog('[AzureStorageService] SAS URL generated successfully:', {
                containerName,
                blobName,
                expiresOn: expiresOn.toISOString(),
                durationMs: Date.now() - startTime
            });

            return blobUrl;
        } catch (error) {
            storageError('[AzureStorageService] Failed to generate SAS URL:', {
                containerName,
                blobName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * Get blob size and last modified metadata
     * @param containerName Container name
     * @param blobName Blob path/name
     * @returns Metadata object with size and last modified date
     */
    async getBlobMetadata(
        containerName: string,
        blobName: string
    ): Promise<{ sizeBytes: number; lastModified: Date }> {
        const startTime = Date.now();

        try {
            storageDebug('[AzureStorageService] Getting blob metadata:', {
                containerName,
                blobName
            });

            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);

            // Get blob properties
            const properties = await blobClient.getProperties();

            const metadata = {
                sizeBytes: properties.contentLength || 0,
                lastModified: properties.lastModified || new Date()
            };

            storageLog('[AzureStorageService] Blob metadata retrieved:', {
                containerName,
                blobName,
                sizeBytes: metadata.sizeBytes,
                lastModified: metadata.lastModified.toISOString(),
                durationMs: Date.now() - startTime
            });

            return metadata;
        } catch (error) {
            storageError('[AzureStorageService] Failed to get blob metadata:', {
                containerName,
                blobName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            throw error;
        }
    }
}