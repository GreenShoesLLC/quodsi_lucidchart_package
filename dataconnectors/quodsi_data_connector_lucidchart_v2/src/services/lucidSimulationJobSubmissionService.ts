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
import { BatchConfigurationError, BatchJobCreationError, BatchInfrastructureError, BatchTaskFailureError } from './errors/batchErrors';
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

    /**
     * Performs all pre-flight checks before job submission.
     * Consolidates API calls to minimize latency:
     * - pool.get() → pool state + application package references
     * - listPoolNodeCounts() → node availability
     * - application.get() → application exists with version
     *
     * Total: 3 API calls (down from 5)
     */
    private async performPreflightChecks(applicationId: string, appVersion: string): Promise<void> {
        console.log('[BatchService] Performing pre-flight checks:', {
            poolId: this.poolId,
            applicationId,
            appVersion
        });

        // 1. Get pool info (state + application package references) - single call
        let pool;
        try {
            pool = await this.batchClient.pool.get(this.poolId);
        } catch (error: any) {
            if (error.code === 'PoolNotFound') {
                throw new BatchInfrastructureError(
                    'Quodsi compute resources are not configured',
                    'INFRASTRUCTURE_ERROR',
                    this.poolId,
                    { poolState: 'not_found' },
                    [
                        'Contact your administrator to verify the compute configuration',
                        'The compute environment may have been removed or renamed'
                    ]
                );
            }
            throw error;
        }

        // Check pool state
        if (pool.state !== 'active') {
            throw new BatchInfrastructureError(
                'Quodsi compute resources are currently unavailable',
                'INFRASTRUCTURE_ERROR',
                this.poolId,
                { poolState: pool.state },
                [
                    'Please wait a few minutes and try again',
                    'Contact your administrator if the issue persists'
                ]
            );
        }

        // Check application package reference on pool (from same pool.get() response)
        const packageRefs = pool.applicationPackageReferences || [];
        const hasPackageRef = packageRefs.some(ref =>
            ref.applicationId?.toLowerCase() === applicationId.toLowerCase() &&
            (ref.version === appVersion || ref.version === '*')
        );

        if (!hasPackageRef) {
            throw new BatchInfrastructureError(
                'Simulation software is not configured on the compute pool',
                'APPLICATION_PACKAGE_ERROR',
                this.poolId,
                {
                    applicationId,
                    appVersion,
                    poolPackages: packageRefs.map(r => `${r.applicationId}@${r.version}`),
                    reason: 'not_referenced_by_pool'
                },
                [
                    `The pool "${this.poolId}" does not have "${applicationId}@${appVersion}" configured`,
                    'Contact your administrator to add the application package to the pool'
                ]
            );
        }

        // 2. Check node availability - second call
        const nodeCounts = await this.getPoolNodeCounts();
        if (nodeCounts.idle + nodeCounts.running === 0) {
            throw new BatchInfrastructureError(
                'No compute resources are currently available',
                'INFRASTRUCTURE_ERROR',
                this.poolId,
                {
                    poolState: 'active',
                    totalNodes: nodeCounts.total,
                    idleNodes: nodeCounts.idle
                },
                [
                    'No compute resources are available to run simulations',
                    'Contact your administrator to enable compute resources',
                    'Compute resources may be temporarily unavailable'
                ]
            );
        }

        // 3. Check application exists with version in Batch account - third call
        try {
            const app = await this.batchClient.application.get(applicationId);

            const versions = app.versions || [];
            if (!versions.includes(appVersion)) {
                throw new BatchInfrastructureError(
                    `Simulation software version ${appVersion} is not available`,
                    'APPLICATION_PACKAGE_ERROR',
                    this.poolId,
                    {
                        applicationId,
                        appVersion,
                        availableVersions: versions,
                        reason: 'version_not_found'
                    },
                    [
                        `Version "${appVersion}" of "${applicationId}" is not installed`,
                        `Available versions: ${versions.length > 0 ? versions.join(', ') : 'none'}`,
                        'Contact your administrator to install the correct version'
                    ]
                );
            }
        } catch (error: any) {
            if (error instanceof BatchInfrastructureError) {
                throw error;
            }

            if (error.code === 'ApplicationNotFound') {
                throw new BatchInfrastructureError(
                    'Simulation software is not installed',
                    'APPLICATION_PACKAGE_ERROR',
                    this.poolId,
                    { applicationId, appVersion, reason: 'application_not_found' },
                    [
                        `Application "${applicationId}" is not registered with the Batch account`,
                        'Contact your administrator to install the simulation software'
                    ]
                );
            }
            throw error;
        }

        console.log('[BatchService] Pre-flight checks passed:', {
            poolId: this.poolId,
            poolState: pool.state,
            totalNodes: nodeCounts.total,
            idleNodes: nodeCounts.idle,
            applicationId,
            appVersion
        });
    }

    /**
     * Gets node counts for the configured pool.
     */
    private async getPoolNodeCounts(): Promise<{ total: number; idle: number; running: number }> {
        const response = await this.batchClient.account.listPoolNodeCounts({
            filter: `poolId eq '${this.poolId}'`
        });

        // Response extends Array<PoolNodeCounts>, find our pool
        for (const poolNodeCounts of response) {
            if (poolNodeCounts.poolId === this.poolId) {
                const dedicated = poolNodeCounts.dedicated;
                const lowPriority = poolNodeCounts.lowPriority;
                return {
                    total: (dedicated?.total || 0) + (lowPriority?.total || 0),
                    idle: (dedicated?.idle || 0) + (lowPriority?.idle || 0),
                    running: (dedicated?.running || 0) + (lowPriority?.running || 0)
                };
            }
        }

        return { total: 0, idle: 0, running: 0 };
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

        // Pre-submission checks - provide fast feedback on infrastructure issues
        // Consolidated into single method with 3 API calls (pool.get, listPoolNodeCounts, application.get)
        await this.performPreflightChecks(applicationId, appVersion);

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
                    poolInfo: poolInfo,
                    constraints: {
                        maxWallClockTime: "PT1H",  // 1 hour maximum runtime
                        maxTaskRetryCount: 1
                    },
                    onAllTasksComplete: "terminatejob"  // Automatically terminate job when all tasks complete
                };

                await this.batchClient.job.add(jobParams);
            }, this.jobRetryOptions);
            // Get the configuration to access the current environment's storage account
            const config = getConfig();
            // Create and submit task with retry
            await retry(async () => {
                const appPackageEnvVar = `AZ_BATCH_APP_PACKAGE_${applicationId.toLowerCase()}_${appVersion.replaceAll(".", "_")}`;
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
                        { name: "AZURE_STORAGE_URL", value: this.extractStorageUrlFromConnectionString(config.azureStorageConnectionString) },
                        { name: "QUODSIM_UPLOAD_MODE", value: "both" }
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

    /**
     * Queries Azure Batch API for current task state.
     * Used for post-submission verification to detect infrastructure failures.
     */
    public async getTaskState(jobId: string, taskId: string): Promise<{
        state: string;
        failureInfo?: {
            category: string;
            code: string;
            message: string;
        };
        executionInfo?: {
            startTime?: Date;
            endTime?: Date;
            exitCode?: number;
        };
    }> {
        try {
            console.log('[BatchService] Getting task state:', { jobId, taskId });

            const task = await this.batchClient.task.get(jobId, taskId);

            const result = {
                state: task.state || 'unknown',
                failureInfo: task.executionInfo?.failureInfo ? {
                    category: task.executionInfo.failureInfo.category || 'unknown',
                    code: task.executionInfo.failureInfo.code || 'unknown',
                    message: task.executionInfo.failureInfo.message || 'Unknown error'
                } : undefined,
                executionInfo: {
                    startTime: task.executionInfo?.startTime,
                    endTime: task.executionInfo?.endTime,
                    exitCode: task.executionInfo?.exitCode
                }
            };

            console.log('[BatchService] Task state retrieved:', {
                jobId,
                taskId,
                state: result.state,
                hasFailureInfo: !!result.failureInfo,
                exitCode: result.executionInfo?.exitCode
            });

            return result;
        } catch (error: any) {
            console.error('[BatchService] Failed to get task state:', {
                jobId,
                taskId,
                error: error.message,
                code: error.code
            });

            // If job/task not found, return a special state
            if (error.code === 'JobNotFound' || error.code === 'TaskNotFound') {
                return {
                    state: 'not_found',
                    failureInfo: {
                        category: 'ResourceNotFound',
                        code: error.code,
                        message: `${error.code === 'JobNotFound' ? 'Job' : 'Task'} no longer exists`
                    }
                };
            }

            throw error;
        }
    }
}