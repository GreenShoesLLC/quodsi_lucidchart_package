// src/services/lucidSimulationJobSubmissionService.ts

import { 
    BatchServiceClient, 
    BatchSharedKeyCredentials,
    JobAddParameter,
    PoolInformation,
    TaskAddParameter
} from '@azure/batch';
import { retry, AttemptContext, PartialAttemptOptions } from '@lifeomic/attempt';
import { BatchConfigurationError, BatchJobCreationError } from './errors/batchErrors';

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

            // Initialize client
            const credentials = new BatchSharedKeyCredentials(
                config.batchAccountName,
                config.batchAccountKey
            );

            this.batchClient = new BatchServiceClient(credentials, config.batchAccountUrl);
            this.poolId = config.poolId;
            this.defaultApplicationId = config.defaultApplicationId || "LucidQuodsim";
            this.defaultAppVersion = config.defaultAppVersion || "1.0";

            console.log('[BatchService] Initialized with pool:', this.poolId);
        } catch (error) {
            if (error instanceof BatchConfigurationError) {
                throw error;
            }
            throw new BatchConfigurationError("Failed to initialize batch configuration.", "Unknown", error as Error);
        }
    }

    private isTransientError(error: any): boolean {
        if (!error.code) return false;

        return [
            'OperationTimedOut',
            'ServerBusy',
            'ServiceUnavailable',
            'RequestRateTooLarge'
        ].includes(error.code);
    }

    public async submitJob(
        documentId: string,
        pageId: string,
        userId: string,
        applicationId?: string,
        appVersion?: string
    ): Promise<string> {
        applicationId = applicationId || this.defaultApplicationId;
        appVersion = appVersion || this.defaultAppVersion;

        console.log('[BatchService] Starting job submission for document:', documentId);

        try {
            const jobId = `Job-${crypto.randomUUID()}`;
            const taskId = `Task-${crypto.randomUUID()}`;

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

            // Create and submit task with retry
            await retry(async () => {
                const appPackageEnvVar = `AZ_BATCH_APP_PACKAGE_${applicationId.toLowerCase()}_${appVersion.replace(".", "_")}`;
                const taskCommandLine = `/bin/bash -c "source $AZ_BATCH_NODE_STARTUP_DIR/wd/batch_env/bin/activate && python3 -m pip list && cd ${appPackageEnvVar} && python3 -m quodsim_runner.lucidchart.cli --document-id ${documentId} --page-id ${pageId} --user-id ${userId}"`;

                const taskParams: TaskAddParameter = {
                    id: taskId,
                    commandLine: taskCommandLine
                };

                await this.batchClient.task.add(jobId, taskParams);
            }, this.taskRetryOptions);

            console.log('[BatchService] Successfully submitted job with task:', { jobId, taskId });
            return `Job '${jobId}' with task '${taskId}' submitted successfully.`;

        } catch (error: any) {
            if (error.code === 'JobExists') {
                throw new BatchJobCreationError("Job already exists", '', error);
            }
            if (error.code) {
                throw new BatchJobCreationError(`Batch error: ${error.message}`, '', error);
            }
            throw new BatchConfigurationError("An unexpected error occurred while submitting the Batch job.", "Unknown", error);
        }
    }
}