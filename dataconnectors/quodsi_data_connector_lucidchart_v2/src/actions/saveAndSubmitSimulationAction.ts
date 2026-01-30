import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from "../services/azureStorageService";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { BatchConfigurationError, BatchJobCreationError, BatchInfrastructureError } from "../services/errors/batchErrors";
import { getConfig, MAX_SCENARIOS } from "../config";
import { ActionLogger } from '../utils/logging';
import { LoggingLevel } from '../utils/loggingLevels';

/**
 * Helper function to extract unique scenario folder names from blob list
 */
function extractScenarioIds(blobNames: string[]): string[] {
    const scenarioIds = new Set<string>();

    for (const blobName of blobNames) {
        // Extract the first part of the path (scenario folder name)
        const parts = blobName.split('/');
        if (parts.length > 1) {
            scenarioIds.add(parts[0]);
        }
    }

    return Array.from(scenarioIds);
}

interface SaveAndSubmitRequest {
    documentId: string;
    scenarioId: string; 
    model: any;
    scenarioName: string;
    diagramSvg?: string; // New field for diagram SVG content
    // applicationId?: string;
    appVersion?: string;
}

interface SaveAndSubmitResult {
    success: boolean;
    error?: string;
    jobId?: string;
    taskId?: string;
}

export const saveAndSubmitSimulationAction: (action: DataConnectorAsynchronousAction) => Promise<SaveAndSubmitResult> = async (
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

        // Initialize storage service
        const storageService = new AzureStorageService(config.azureStorageConnectionString);

        // Check scenario limit before proceeding
        logger.info('Checking scenario count limit');
        const hasContainer = await storageService.containerExists(documentId);

        if (hasContainer) {
            // List all blobs to count existing scenarios
            const allBlobs = await storageService.listBlobs(documentId);
            const existingScenarioIds = extractScenarioIds(allBlobs);

            logger.info(`Found ${existingScenarioIds.length} existing scenarios: ${existingScenarioIds.join(', ')}`);

            // Check if we're adding a new scenario (not updating existing one)
            if (!existingScenarioIds.includes(scenarioId) && existingScenarioIds.length >= MAX_SCENARIOS) {
                const errorMsg = `Maximum ${MAX_SCENARIOS} scenarios per document reached. Delete a scenario to continue.`;
                logger.error(errorMsg);
                return {
                    success: false,
                    error: errorMsg
                };
            }
        }

        // Get configuration
        logger.info(`Operating in environment: ${config.environment}`);
        logger.debug(`Using storage account: ${config.azureStorageConnectionString.includes('AccountName=') ? 
            config.azureStorageConnectionString.split('AccountName=')[1].split(';')[0] : 'unknown'}`);
        logger.debug(`Using batch pool: ${config.batchPoolId}`);
        logger.debug(`Using application: ${config.defaultApplicationId}`);
        // Phase 1: Upload model to blob storage
        const uploadStart = Date.now();

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

        // Upload initial status.json with scenario name and RUNNING state so:
        // 1. ListScenarios returns the correct name before the Python runner starts
        // 2. Smart refresh in ScenarioEditor keeps polling (it checks for runState === 'RUNNING')
        const initialStatus = JSON.stringify({
            id: scenarioId,
            name: scenarioName,
            runState: 'RUNNING',
            submittedAt: new Date().toISOString()
        }, null, 2);
        const statusBlobName = `${scenarioId}/status.json`;
        logger.info(`Uploading initial status.json for scenario: ${scenarioId}`);
        const statusUploadSuccess = await storageService.uploadBlobContent(
            documentId,
            statusBlobName,
            initialStatus
        );
        if (!statusUploadSuccess) {
            logger.warn('Failed to upload initial status.json, but continuing with simulation');
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

        // Extract jobId and taskId for return value
        const jobId = jobIdMatch?.[1];
        const taskId = taskIdMatch?.[1];

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
            jobId,
            taskId,
            blobUrl: `${documentId}/${blobName}`
        });

        return {
            success: true,
            jobId,
            taskId
        };

    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        const data = action.data as SaveAndSubmitRequest;
        const { documentId, scenarioId, scenarioName } = data;

        if (error instanceof BatchInfrastructureError) {
            logger.error(`Batch infrastructure error after ${errorDuration}ms:`, {
                poolId: error.poolId,
                errorType: error.errorType,
                details: error.details,
                message: error.message
            });

            // Write infrastructure error to status.json so UI can display it
            try {
                const config = getConfig();
                const storageService = new AzureStorageService(config.azureStorageConnectionString);
                const errorStatus = JSON.stringify({
                    id: scenarioId,
                    name: scenarioName,
                    runState: 'RAN_WITH_ERRORS',
                    error: error.message,
                    errorType: error.errorType,
                    errorDetails: `Compute: ${error.details.poolState || 'unknown'}, Available: ${error.details.totalNodes || 0}`,
                    errorSuggestions: error.suggestions,
                    lastUpdated: new Date().toISOString()
                }, null, 2);

                await storageService.uploadBlobContent(documentId, `${scenarioId}/status.json`, errorStatus);
                logger.error('Infrastructure error - status.json updated with error details');
            } catch (statusError) {
                logger.error('Failed to write infrastructure error to status.json:', {
                    message: statusError instanceof Error ? statusError.message : 'Unknown error'
                });
            }
        } else if (error instanceof BatchConfigurationError) {
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