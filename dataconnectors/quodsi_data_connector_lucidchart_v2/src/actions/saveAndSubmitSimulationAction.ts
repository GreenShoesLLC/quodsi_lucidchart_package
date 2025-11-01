import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from "../services/azureStorageService";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { BatchConfigurationError, BatchJobCreationError } from "../services/errors/batchErrors";
import { getConfig } from "../config";
import { ActionLogger } from '../utils/logging';
import { updateModelData } from '../services';
import { LoggingLevel } from '../utils/loggingLevels';

interface SaveAndSubmitRequest {
    documentId: string;
    scenarioId: string; 
    model: any;
    scenarioName: string;
    diagramSvg?: string; // New field for diagram SVG content
    // applicationId?: string;
    appVersion?: string;
}

export const saveAndSubmitSimulationAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    const metrics = {
        startTime: Date.now(),
        uploadDuration: 0,
        svgUploadDuration: 0, // New metric for SVG upload
        batchSubmitDuration: 0
    };

    // Get config and logging level
    const config = getConfig();
    // Since this is a user-initiated action, use NORMAL level by default
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;

    const logger = new ActionLogger('[saveAndSubmitSimulationAction]', loggingLevel);
    logger.important('Starting execution');

    try {
        // Extract and validate request data
        const data = action.data as SaveAndSubmitRequest;
        const { documentId, scenarioId, model, scenarioName, diagramSvg, appVersion } = data;
        
        // Use default baseline scenario ID if not provided
        // const scenarioId = data.scenarioId || BASELINE_SCENARIO_ID;
        
        if (!documentId || !scenarioId || !model || !scenarioName || !appVersion) {
            logger.error('Missing required fields');
            return { success: false };
        }

        // Get configuration
        logger.info(`Operating in environment: ${config.environment}`);
        logger.debug(`Using storage account: ${config.azureStorageConnectionString.includes('AccountName=') ? 
            config.azureStorageConnectionString.split('AccountName=')[1].split(';')[0] : 'unknown'}`);
        logger.debug(`Using batch pool: ${config.batchPoolId}`);
        logger.debug(`Using application: ${config.defaultApplicationId}`);
        // Phase 1: Upload model to blob storage
        const uploadStart = Date.now();
        const storageService = new AzureStorageService(config.azureStorageConnectionString);
        
        // Include scenario ID in the blob name for uniqueness
        const blobName = `${scenarioId}/model.json`;
        const modelJson = JSON.stringify(model, null, 2);
        
        logger.info(`Uploading model to blob storage for document: ${documentId}, scenario: ${scenarioId}`);
        const uploadSuccess = await storageService.uploadBlobContent(
            documentId,  // Using documentId as container name
            blobName,
            modelJson
        );
        
        metrics.uploadDuration = Date.now() - uploadStart;

        if (!uploadSuccess) {
            logger.error('Failed to upload model definition');
            return { success: false };
        }

        // New Phase: Upload diagram SVG if provided
        if (diagramSvg) {
            const svgUploadStart = Date.now();
            const svgBlobName = `${scenarioId}/diagram.svg`;
            
            logger.info(`Uploading diagram SVG to blob storage for document: ${documentId}, scenario: ${scenarioId}`);
            const svgUploadSuccess = await storageService.uploadBlobContent(
                documentId,
                svgBlobName,
                diagramSvg
            );
            
            metrics.svgUploadDuration = Date.now() - svgUploadStart;
            
            if (!svgUploadSuccess) {
                logger.warn('Failed to upload diagram SVG, but continuing with simulation');
                // Note: We don't fail the whole operation if just the SVG upload fails
            } else {
                logger.info('Diagram SVG uploaded successfully');
            }
        } else {
            logger.info('No diagram SVG provided, skipping diagram upload');
        }

        // Phase 2: Submit batch job
        const batchStart = Date.now();
        logger.info('Submitting batch job');
        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: config.batchAccountUrl,
            batchAccountName: config.batchAccountName,
            batchAccountKey: config.batchAccountKey,
            poolId: config.batchPoolId,
            defaultApplicationId: config.defaultApplicationId, //TODO: handle old lucid versions
            defaultAppVersion: config.defaultAppVersion //TODO: handle old lucid versions
        });

        // Pass scenarioId to batch service
        const batchResult = await batchService.submitJob(
            documentId,
            scenarioId,
            scenarioName,
            config.defaultApplicationId,
            appVersion,
        );
        metrics.batchSubmitDuration = Date.now() - batchStart;

        // Extract jobId and taskId from batch result for logging
        const jobIdMatch = batchResult.match(/Job '([^']+)'/);
        const taskIdMatch = batchResult.match(/task '([^']+)'/);

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        logger.important('Operation completed', {
            totalDuration: `${totalDuration}ms`,
            uploadDuration: `${metrics.uploadDuration}ms`,
            svgUploadDuration: diagramSvg ? `${metrics.svgUploadDuration}ms` : 'N/A',
            batchSubmitDuration: `${metrics.batchSubmitDuration}ms`,
            documentId,
            scenarioId,
            diagramSaved: !!diagramSvg,
            jobId: jobIdMatch?.[1],
            taskId: taskIdMatch?.[1],
            blobUrl: `${documentId}/${blobName}`
        });

        return { success: true };

    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        
        if (error instanceof BatchConfigurationError) {
            logger.error(`Batch configuration error after ${errorDuration}ms:`, {
                configurationKey: error.configurationKey,
                message: error.message
            });
        } else if (error instanceof BatchJobCreationError) {
            logger.error(`Batch job creation error after ${errorDuration}ms:`, {
                jobId: error.jobId,
                batchError: error.batchError,
                message: error.message
            });
        } else {
            logger.error(`Unexpected error after ${errorDuration}ms:`, {
                type: error.constructor.name,
                message: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined
            });
        }

        return { success: false };
    }
};