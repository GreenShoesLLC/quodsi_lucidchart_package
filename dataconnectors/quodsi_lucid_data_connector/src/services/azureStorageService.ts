// src/services/azureStorageService.ts

import { BlobServiceClient } from '@azure/storage-blob';
import { retry, AttemptContext, PartialAttemptOptions } from '@lifeomic/attempt';

export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private blobRetryOptions: PartialAttemptOptions<string>;
    private existsRetryOptions: PartialAttemptOptions<boolean>;

    constructor(connectionString: string) {
        console.log('[AzureStorageService] Initializing service');
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        console.log('[AzureStorageService] BlobServiceClient initialized:', {
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
                console.warn('[AzureStorageService] Container check retry:', {
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
                console.warn('[AzureStorageService] Blob retrieval retry:', {
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

            console.log('[AzureStorageService] Container check:', {
                containerName,
                exists,
                durationMs: Date.now() - startTime
            });

            return exists;
        } catch (error) {
            console.error('[AzureStorageService] Container check failed:', {
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
                console.log('[AzureStorageService] Blob download:', {
                    size: content.length,
                    downloadMs: Date.now() - downloadStart
                });

                return content.toString();
            }, this.blobRetryOptions);

            console.log('[AzureStorageService] Blob retrieved:', {
                containerName,
                blobName,
                contentLength: content.length,
                contentType: properties?.contentType,
                durationMs: Date.now() - startTime
            });

            return content;
        } catch (error) {
            console.error('[AzureStorageService] Blob retrieval failed:', {
                containerName,
                blobName,
                error: error.message,
                durationMs: Date.now() - startTime
            });
            return null;
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