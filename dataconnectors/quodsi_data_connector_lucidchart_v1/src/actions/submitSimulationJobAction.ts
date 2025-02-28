import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { BatchConfigurationError, BatchJobCreationError } from "../services/errors/batchErrors";

interface SubmitJobRequest {
    documentId: string;
    pageId: string;
    userId: string;
    applicationId?: string;
    appVersion?: string;
}

export const submitSimulationJobAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    const metrics = {
        startTime: Date.now()
    };

    console.log('[submitSimulationJobAction] Starting execution');

    try {
        // Extract and validate request data
        const data = action.data as SubmitJobRequest;
        const { documentId, pageId, userId, applicationId, appVersion } = data;
        
        if (!documentId || !pageId || !userId) {
            console.error('[submitSimulationJobAction] Missing required fields', {
                hasDocumentId: !!documentId,
                hasPageId: !!pageId,
                hasUserId: !!userId
            });
            return { success: false };
        }

        console.log('[submitSimulationJobAction] Initializing batch service');
        
        // Initialize batch service with configuration from environment
        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: process.env.BatchAccountUrl!,
            batchAccountName: process.env.BatchAccountName!,
            batchAccountKey: process.env.BatchAccountKey!,
            poolId: process.env.BatchPoolId!,
            defaultApplicationId: process.env.DefaultApplicationId,
            defaultAppVersion: process.env.DefaultAppVersion
        });

        console.log('[submitSimulationJobAction] Submitting job to batch service', {
            documentId,
            pageId,
            userId,
            applicationId,
            appVersion
        });

        // Submit the job
        const result = await batchService.submitJob(
            documentId,
            pageId,
            userId,
            applicationId,
            appVersion
        );

        // Extract jobId and taskId from result message for logging
        const jobIdMatch = result.match(/Job '([^']+)'/);
        const taskIdMatch = result.match(/task '([^']+)'/);

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        console.log('[submitSimulationJobAction] Operation completed', {
            totalDuration: `${totalDuration}ms`,
            documentId,
            pageId,
            userId,
            jobId: jobIdMatch?.[1],
            taskId: taskIdMatch?.[1],
            result
        });

        return { success: true };

    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        
        if (error instanceof BatchConfigurationError) {
            console.error(`[submitSimulationJobAction] Batch configuration error after ${errorDuration}ms:`, {
                configurationKey: error.configurationKey,
                message: error.message
            });
        } else if (error instanceof BatchJobCreationError) {
            console.error(`[submitSimulationJobAction] Batch job creation error after ${errorDuration}ms:`, {
                jobId: error.jobId,
                batchError: error.batchError,
                message: error.message
            });
        } else {
            console.error(`[submitSimulationJobAction] Unexpected error after ${errorDuration}ms:`, {
                type: error.constructor.name,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
        }

        return { success: false };
    }
};