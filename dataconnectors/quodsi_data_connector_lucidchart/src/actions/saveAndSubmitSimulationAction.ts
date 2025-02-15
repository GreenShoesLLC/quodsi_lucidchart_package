import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from "../services/azureStorageService";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { BatchConfigurationError, BatchJobCreationError } from "../services/errors/batchErrors";

interface SaveAndSubmitRequest {
    documentId: string;
    pageId: string;
    userId: string;
    model: any;
    applicationId?: string;
    appVersion?: string;
}

export const saveAndSubmitSimulationAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    const metrics = {
        startTime: Date.now(),
        uploadDuration: 0,
        batchSubmitDuration: 0
    };

    console.log('[saveAndSubmitSimulationAction] Starting execution');

    try {
        // Extract and validate request data
        const data = action.data as SaveAndSubmitRequest;
        const { documentId, pageId, userId, model, applicationId, appVersion } = data;
        
        if (!documentId || !pageId || !userId || !model) {
            console.error('[saveAndSubmitSimulationAction] Missing required fields');
            return { success: false };
        }

        // Phase 1: Upload model to blob storage
        const uploadStart = Date.now();
        const storageService = new AzureStorageService(process.env.AzureStorageConnectionString!);
        
        const blobName = `model_${userId}_${pageId}.json`;
        const modelJson = JSON.stringify(model, null, 2);
        
        console.log(`[saveAndSubmitSimulationAction] Uploading model to blob storage for document: ${documentId}`);
        const uploadSuccess = await storageService.uploadBlobContent(
            documentId,  // Using documentId as container name
            blobName,
            modelJson
        );
        
        metrics.uploadDuration = Date.now() - uploadStart;

        if (!uploadSuccess) {
            console.error('[saveAndSubmitSimulationAction] Failed to upload model definition');
            return { success: false };
        }

        // Phase 2: Submit batch job
        const batchStart = Date.now();
        console.log('[saveAndSubmitSimulationAction] Submitting batch job');
        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: process.env.BatchAccountUrl!,
            batchAccountName: process.env.BatchAccountName!,
            batchAccountKey: process.env.BatchAccountKey!,
            poolId: process.env.BatchPoolId!,
            defaultApplicationId: process.env.DefaultApplicationId,
            defaultAppVersion: process.env.DefaultAppVersion
        });

        const batchResult = await batchService.submitJob(
            documentId,
            pageId,
            userId,
            applicationId,
            appVersion
        );
        metrics.batchSubmitDuration = Date.now() - batchStart;

        // Extract jobId and taskId from batch result for logging
        const jobIdMatch = batchResult.match(/Job '([^']+)'/);
        const taskIdMatch = batchResult.match(/task '([^']+)'/);

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        console.log('[saveAndSubmitSimulationAction] Operation completed', {
            totalDuration: `${totalDuration}ms`,
            uploadDuration: `${metrics.uploadDuration}ms`,
            batchSubmitDuration: `${metrics.batchSubmitDuration}ms`,
            documentId,
            pageId,
            userId,
            jobId: jobIdMatch?.[1],
            taskId: taskIdMatch?.[1],
            blobUrl: `${documentId}/${blobName}`
        });

        return { success: true };

    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        
        if (error instanceof BatchConfigurationError) {
            console.error(`[saveAndSubmitSimulationAction] Batch configuration error after ${errorDuration}ms:`, {
                configurationKey: error.configurationKey,
                message: error.message
            });
        } else if (error instanceof BatchJobCreationError) {
            console.error(`[saveAndSubmitSimulationAction] Batch job creation error after ${errorDuration}ms:`, {
                jobId: error.jobId,
                batchError: error.batchError,
                message: error.message
            });
        } else {
            console.error(`[saveAndSubmitSimulationAction] Unexpected error after ${errorDuration}ms:`, {
                type: error.constructor.name,
                message: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined
            });
        }

        return { success: false };    }
};