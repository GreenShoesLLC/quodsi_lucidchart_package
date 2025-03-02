// src/services/azureStorageService.ts

import { BlobServiceClient, BlobUploadCommonResponse } from '@azure/storage-blob';
import { retry, AttemptContext, PartialAttemptOptions } from '@lifeomic/attempt';

// Static verbosity control for all instances of AzureStorageService
let isVerboseLogging = false;

/**
 * Set whether verbose logging is enabled for all storage service instances
 */
export function setStorageVerboseLogging(verbose: boolean): void {
    isVerboseLogging = verbose;
}

/**
 * Conditionally logs based on verbosity setting
 */
function storageLog(message: string, ...args: any[]): void {
    if (isVerboseLogging) {
        console.log(message, ...args);
    }
}

/**
 * Warning logs - only shown if verbose logging is enabled
 */
function storageWarn(message: string, ...args: any[]): void {
    if (isVerboseLogging) {
        console.warn(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 */
function storageError(message: string, ...args: any[]): void {
    console.error(message, ...args);
}

export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private blobRetryOptions: PartialAttemptOptions<string>;
    private existsRetryOptions: PartialAttemptOptions<boolean>;
    private uploadRetryOptions: PartialAttemptOptions<BlobUploadCommonResponse>;

    constructor(connectionString: string) {
        storageLog('[AzureStorageService] Initializing service');
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

    async getBlobContent(containerName: string, blobName: string): Promise<string | null> {
        const startTime = Date.now();

        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);

            // Check existence and get content in parallel if possible
            const [exists, properties] = await Promise.all([
                blobClient.exists(),
                blobClient.getProperties().catch(() => null)
            ]);

            if (!exists) {
                return null;
            }

            const content = await retry(async () => {
                const downloadStart = Date.now();
                const response = await blobClient.download();

                const content = await this.streamToBuffer(response.readableStreamBody!);
                storageLog('[AzureStorageService] Blob download:', {
                    size: content.length,
                    downloadMs: Date.now() - downloadStart
                });

                return content.toString();
            }, this.blobRetryOptions);

            storageLog('[AzureStorageService] Blob retrieved:', {
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
                storageLog('[AzureStorageService] Container created:', { containerName });
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

                storageLog('[AzureStorageService] Blob upload:', {
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
}