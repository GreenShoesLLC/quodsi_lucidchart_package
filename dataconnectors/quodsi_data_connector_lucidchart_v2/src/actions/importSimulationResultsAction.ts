// actions/importSimulationResultsAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { setStorageVerboseLogging } from "../services/azureStorageService";
import { createSimulationImportService, getStorageService } from "../services";
import { ActionLogger } from '../utils/logging';
import { LoggingLevel } from '../utils/loggingLevels';
import { getConfig } from "../config";

export const importSimulationResultsAction = async (action: DataConnectorAsynchronousAction) => {
    // Get config and logging level - use the same level as hardRefresh since this is user-initiated
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    
    // Create a simple ID for this action instance
    const actionId = Math.random().toString(36).substring(2, 10);
    const logger = new ActionLogger(`[Import:${actionId}]`, loggingLevel);

    try {
        logger.important(`=== Import Simulation Results Action Started ===`);
        logger.debug(`Action data:`, JSON.stringify(action.data, null, 2));

        // Set storage service logging level
        const storageLoggingLevel = config.logging?.storageServiceLoggingLevel || LoggingLevel.NORMAL;
        setStorageVerboseLogging(storageLoggingLevel);

        // Get the data from action.data with required scenarioId
        const data = action.data as {
            documentId: string;
            scenarioId: string;
            collectionsToImport?: string[]
        };

        if (!data.scenarioId) {
            throw new Error('scenarioId is required for import action');
        }

        // Create an instance of the simulation import service
        const importService = createSimulationImportService(loggingLevel >= LoggingLevel.VERBOSE);

        // DIAGNOSTIC: Log important information about the container and scenario
        logger.important(`CONTAINER DIAGNOSIS: Using container=${data.documentId}, scenarioId=${data.scenarioId}`);
        
        try {
            // Diagnostic check for container and contents
            const storageService = getStorageService();
            
            // Check if container exists
            const containerExists = await storageService.containerExists(data.documentId);
            logger.important(`CONTAINER CHECK: ${data.documentId} exists? ${containerExists}`);
            
            if (containerExists) {
                // Try to list blobs at top level
                try {
                    const topLevelBlobs = await storageService.listBlobs(data.documentId);
                    logger.important(`CONTAINER CONTENTS: Found ${topLevelBlobs.length} top-level items`);
                    
                    // Extract folder names
                    const folders = new Set<string>();
                    topLevelBlobs.forEach(blob => {
                        const parts = blob.split('/');
                        if (parts.length > 1) {
                            folders.add(parts[0]);
                        }
                    });
                    
                    logger.important(`TOP FOLDERS: ${Array.from(folders).join(', ')}`);
                    
                    if (folders.has(data.scenarioId)) {
                        logger.important(`FOUND SCENARIO FOLDER: ${data.scenarioId} exists in container`);
                        
                        // Check what's in the scenario folder
                        const scenarioBlobs = await storageService.listBlobs(data.documentId, data.scenarioId);
                        logger.important(`SCENARIO FOLDER: Contains ${scenarioBlobs.length} files`);
                        
                        if (scenarioBlobs.length > 0) {
                            const csvFiles = scenarioBlobs.filter(b => b.endsWith('.csv'));
                            logger.important(`CSV FILES: Found ${csvFiles.length} CSV files in scenario folder`);
                            
                            if (csvFiles.length > 0) {
                                // List the first few CSV files
                                const samplesToShow = Math.min(3, csvFiles.length);
                                logger.important(`SAMPLE CSV FILES: ${csvFiles.slice(0, samplesToShow).join(', ')}`);
                            }
                        }
                    } else {
                        logger.error(`SCENARIO FOLDER NOT FOUND: ${data.scenarioId} does not exist in container!`);
                    }
                } catch (listError) {
                    logger.error(`ERROR LISTING BLOBS: ${listError.message}`);
                }
            }
        } catch (diagError) {
            logger.error(`DIAGNOSTIC ERROR: ${diagError.message}`);
        }
        
        // Use the service to perform the import
        const result = await importService.importSimulationResults(action, {
            documentId: data.documentId,
            scenarioId: data.scenarioId,
            collectionsToImport: data.collectionsToImport,
            verboseLogging: loggingLevel >= LoggingLevel.VERBOSE
        });

        if (result.success) {
            logger.important(`=== Import Simulation Results Action Completed Successfully ===`);
        } else {
            logger.error(`=== Import Simulation Results Action Completed with Errors ===`);
            if (result.error) {
                logger.error(`Error: ${result.error}`);
            }
        }

        return result;

    } catch (error) {
        logger.error(`=== Error in Import Simulation Results Action ===`);
        logger.error(`Error details:`, error);
        if (error instanceof Error) {
            logger.error(`Error name: ${error.name}`);
            logger.error(`Error message: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
        }
        return { success: false };
    }
};
