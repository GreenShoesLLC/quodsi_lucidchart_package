import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from "../services/azureStorageService";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { updateScenarioResultsData } from "../services/scenarioResultsService";
import { BatchConfigurationError, BatchJobCreationError } from "../services/errors/batchErrors";
import { getConfig } from "../config";
import { ActionLogger } from '../utils/logging';
import { updateModelData } from '../services';
import { LoggingLevel } from '../utils/loggingLevels';

// Default baseline scenario ID (all zeros UUID)
const BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';

interface SaveAndSubmitRequest {
    documentId: string;
    scenarioId: string; 
    model: any;
    scenarioName: string
    // applicationId?: string;
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

    // Get config and logging level
    const config = getConfig();
    // Since this is a user-initiated action, use NORMAL level by default
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;

    const logger = new ActionLogger('[saveAndSubmitSimulationAction]', loggingLevel);
    logger.important('Starting execution');

    try {
        // Extract and validate request data
        const data = action.data as SaveAndSubmitRequest;
        const { documentId, scenarioId, model, scenarioName, appVersion } = data;
        
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
        // Create a scenario record in the "submitted" state
        logger.info(`Creating scenario record with ID: ${scenarioId}`);
        try {
            const scenarioResult = await updateScenarioResultsData(
                action,
                documentId,
                scenarioId,
                loggingLevel >= LoggingLevel.VERBOSE, // Use verbose flag based on logging level
                logger
            );

            if (scenarioResult.success) {
                logger.info('Scenario record created successfully');
            } else {
                logger.error(`Failed to create scenario record: ${scenarioResult.error}`);
                // Continue with simulation even if scenario record creation fails
            }
        } catch (scenarioError) {
            logger.error(`Unexpected error creating scenario record: ${scenarioError.message}`);
            // Continue with simulation even if scenario record creation fails
        }

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
            
            // Update scenario status to 'failed'
            const failedUpdate = await updateScenarioResultsData(
                action,
                documentId,
                scenarioId,
                loggingLevel >= LoggingLevel.VERBOSE,
                logger
            );

            if (!failedUpdate.success) {
                logger.error(`Failed to update scenario status to 'failed': ${failedUpdate.error}`);
            }
            
            return { success: false };
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

        // Update scenario to 'running' state
        const runningUpdate = await updateScenarioResultsData(
            action,
            documentId,
            scenarioId,
            loggingLevel >= LoggingLevel.VERBOSE,
            logger
        );

        if (!runningUpdate.success) {
            logger.error(`Failed to update scenario status to 'running': ${runningUpdate.error}`);
            // Continue with returning success even if status update fails
        }

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        logger.important('Operation completed', {
            totalDuration: `${totalDuration}ms`,
            uploadDuration: `${metrics.uploadDuration}ms`,
            batchSubmitDuration: `${metrics.batchSubmitDuration}ms`,
            documentId,
            scenarioId,
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

        // If we have the data object, try to update the scenario to failed state
        try {
            const data = action.data as SaveAndSubmitRequest;
            if (data && data.documentId && data.scenarioId) {
                const failedUpdate = await updateScenarioResultsData(
                    action,
                    data.documentId,
                    data.scenarioId,
                    loggingLevel >= LoggingLevel.VERBOSE,
                    logger
                );
                
                if (!failedUpdate.success) {
                    logger.error(`Failed to update scenario status to 'failed': ${failedUpdate.error}`);
                }
            }
        } catch (scenarioUpdateError) {
            logger.error(`Unexpected error updating scenario status: ${scenarioUpdateError.message}`);
            if (scenarioUpdateError.stack) {
                logger.error(`Stack trace: ${scenarioUpdateError.stack}`);
            }
        }

        return { success: false };
    }
};