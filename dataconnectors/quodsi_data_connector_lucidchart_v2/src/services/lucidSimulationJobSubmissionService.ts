// src/services/lucidSimulationJobSubmissionService.ts
import { randomUUID } from 'crypto';
import {
    BatchServiceClient,
    BatchSharedKeyCredentials,
    JobAddParameter,
    PoolInformation,
    TaskAddParameter
} from '@azure/batch';
import { retry, AttemptContext, PartialAttemptOptions } from '@lifeomic/attempt';
import { BatchConfigurationError, BatchJobCreationError } from './errors/batchErrors';
import { getConfig } from '../config';

interface BatchConfiguration {
    batchAccountUrl: string;
    batchAccountName: string;
    batchAccountKey: string;
    poolId: string;
    defaultApplicationId?: string;
    defaultAppVersion?: string;
}

export class LucidSimulationJobSubmissionService {
    private readonly batchClient: BatchServiceClient;
    private readonly defaultApplicationId: string;
    private readonly defaultAppVersion: string;
    private readonly poolId: string;
    private readonly batchAccountName: string;
    private readonly batchAccountKey: string;
    private readonly batchAccountUrl: string;

    private readonly jobRetryOptions: PartialAttemptOptions<any> = {
        maxAttempts: 3,
        factor: 2,
        timeout: 30000,
        handleError: async (error: any, context: AttemptContext) => {
            console.warn('[BatchService] Job creation retry:', {
                attempt: context.attemptNum,
                error: error.message,
                code: error.code
            });
        }
    };

    private readonly taskRetryOptions: PartialAttemptOptions<void> = {
        maxAttempts: 3,
        factor: 2,
        timeout: 30000,
        handleError: async (error: any, context: AttemptContext) => {
            console.warn('[BatchService] Task submission retry:', {
                attempt: context.attemptNum,
                error: error.message,
                code: error.code
            });
        }
    };

    constructor(config: BatchConfiguration) {
        try {
            // Validate configuration
            if (!config.batchAccountUrl) throw new BatchConfigurationError("BatchAccountUrl is not configured.", "BatchAccountUrl");
            if (!config.batchAccountName) throw new BatchConfigurationError("BatchAccountName is not configured.", "BatchAccountName");
            if (!config.batchAccountKey) throw new BatchConfigurationError("BatchAccountKey is not configured.", "BatchAccountKey");
            if (!config.poolId) throw new BatchConfigurationError("BatchPoolId is not configured.", "BatchPoolId");

            // Store configuration values
            this.batchAccountName = config.batchAccountName;
            this.batchAccountKey = config.batchAccountKey;
            this.batchAccountUrl = config.batchAccountUrl;

            // Initialize client
            const credentials = new BatchSharedKeyCredentials(
                config.batchAccountName,
                config.batchAccountKey
            );

            this.batchClient = new BatchServiceClient(credentials, config.batchAccountUrl);
            this.poolId = config.poolId;
            this.defaultApplicationId = config.defaultApplicationId || "dev_quodsim";
            this.defaultAppVersion = config.defaultAppVersion || "1.0";

            console.log('[BatchService] Initialized with pool:', this.poolId);
        } catch (error) {
            if (error instanceof BatchConfigurationError) {
                throw error;
            }
            throw new BatchConfigurationError("Failed to initialize batch configuration.", "Unknown", error as Error);
        }
    }

    // Helper method to extract storage URL from connection string
    private extractStorageUrlFromConnectionString(connectionString: string): string {
        // Default URL in case we can't extract it
        let storageUrl = "https://devquodsist01.blob.core.windows.net";

        try {
            // Find the account name in the connection string
            const accountNameMatch = connectionString.match(/AccountName=([^;]+)/i);
            if (accountNameMatch && accountNameMatch[1]) {
                const accountName = accountNameMatch[1];
                storageUrl = `https://${accountName}.blob.core.windows.net`;
                console.log(`[BatchService] Extracted storage URL: ${storageUrl}`);
            }
        } catch (error) {
            console.warn('[BatchService] Failed to extract storage URL from connection string, using default');
        }

        return storageUrl;
    }

    public async submitJob(
        documentId: string,
        scenarioId: string,
        scenarioName: string,
        applicationId?: string,
        appVersion?: string
    ): Promise<string> {
        applicationId = applicationId || this.defaultApplicationId;
        appVersion = appVersion || this.defaultAppVersion;
        
        console.log('[BatchService] Starting job submission for document:', documentId, 'scenario:', scenarioId || 'default');

        try {
            const jobId = `Job-${randomUUID()}`;
            const taskId = `Task-${randomUUID()}`;

            // Create and commit job with retry
            await retry(async () => {
                const poolInfo: PoolInformation = {
                    poolId: this.poolId
                };

                const jobParams: JobAddParameter = {
                    id: jobId,
                    poolInfo: poolInfo
                };

                await this.batchClient.job.add(jobParams);
            }, this.jobRetryOptions);
            // Get the configuration to access the current environment's storage account
            const config = getConfig();
            // Create and submit task with retry
            await retry(async () => {
                const appPackageEnvVar = `AZ_BATCH_APP_PACKAGE_${applicationId.toLowerCase()}_${appVersion.replace(".", "_")}`;
                // Add scenarioId parameter to the command line if provided

                const taskCommandLine = `/bin/bash -c "source $AZ_BATCH_NODE_STARTUP_DIR/wd/batch_env/bin/activate && python3 -m pip list && cd $${appPackageEnvVar} && python3 -m quodsim_runner.lucidchart.cli --document-id \\"${documentId}\\" --scenario-id \\"${scenarioId}\\" --scenario-name \\"${scenarioName}\\""`;

                const taskParams: TaskAddParameter = {
                    id: taskId,
                    commandLine: taskCommandLine,
                    // Using stored configuration values instead of direct environment access
                    environmentSettings: [
                        { name: "BATCH_ACCOUNT_NAME", value: this.batchAccountName },
                        { name: "BATCH_ACCOUNT_KEY", value: this.batchAccountKey },
                        { name: "BATCH_URL", value: this.batchAccountUrl },
                        { name: "AZURE_STORAGE_CONNECTION_STRING", value: config.azureStorageConnectionString },
                        { name: "AZURE_STORAGE_URL", value: this.extractStorageUrlFromConnectionString(config.azureStorageConnectionString) }
                    ]
                };

                await this.batchClient.task.add(jobId, taskParams);
            }, this.taskRetryOptions);

            console.log('[BatchService] Successfully submitted job with task:', { jobId, taskId, scenarioId, scenarioName });
            return `Job '${jobId}' with task '${taskId}' submitted successfully.`;

        } catch (error: any) {
            // Log the original error details first!
            console.error('[BatchService] Caught unexpected error during job/task submission:', {
                errorMessage: error.message,
                errorCode: error.code, // Log code even if it might be undefined
                errorStack: error.stack,
                errorDetails: error // Log the whole error object if possible
            });

            if (error.code === 'JobExists') {
                throw new BatchJobCreationError("Job already exists", '', error);
            }
            if (error.code) {
                throw new BatchJobCreationError(`Batch error: ${error.message}`, '', error);
            }
            // Now throw the generic error
            throw new BatchConfigurationError("An unexpected error occurred while submitting the Batch job.", "Unknown", error);
        }
    }
}