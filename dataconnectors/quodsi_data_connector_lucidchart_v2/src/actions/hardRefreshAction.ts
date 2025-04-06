// actions/hardRefreshAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { setStorageVerboseLogging } from "../services/azureStorageService";
import { initializeStorageService } from "../services/simulationData";
import {
    getScenarioResultIds,
    parseScenarioResultId,
    createSimulationImportService
} from "../services";
import { ActionLogger } from "../utils/logging";
import { 
    updateResultsLastImported 
} from "../utils/simulationResultsUtils";
import { LoggingLevel } from "../utils/loggingLevels";

export const hardRefreshAction = async (action: DataConnectorAsynchronousAction) => {
    // Get logging level from config - use NORMAL level by default for user-initiated actions
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    
    const logger = new ActionLogger('[HardRefreshAction]', loggingLevel);

    try {
        // Log start of action (visible at MINIMAL level)
        logger.important("=== Hard Refresh Action Started ===");

        // Set storage service logging level (can be more verbose for user-initiated actions)
        const storageLoggingLevel = config.logging?.storageServiceLoggingLevel || LoggingLevel.NORMAL;
        setStorageVerboseLogging(storageLoggingLevel);
        
        // IMPORTANT: Initialize storage service before using it
        initializeStorageService(config.azureStorageConnectionString);
        logger.info("Storage service initialized");
        
        // Step 1: Check for any ScenarioResultsSchema instances
        logger.info("Checking for scenario results...");
        const scenarioResultIds = await getScenarioResultIds(action, loggingLevel >= LoggingLevel.VERBOSE, logger);
        const collectionsToImport: string[] = [];
        
        if (scenarioResultIds.length > 0) {
            logger.info(`Found ${scenarioResultIds.length} scenario results`);
            // Create an instance of the simulation import service (verbose only if we're in VERBOSE mode)
            const importService = createSimulationImportService(loggingLevel >= LoggingLevel.VERBOSE);
            
            // Process each scenario result ID
            for (const compositeId of scenarioResultIds) {
                try {
                    // Parse the composite ID to get documentId and scenarioId
                    const { documentId, scenarioId } = parseScenarioResultId(compositeId);
                    logger.info(`Hard refresh found scenario: documentId=${documentId}, scenarioId=${scenarioId}`);
                    
                    // For hard refresh, we always import regardless of timestamps
                    logger.info(`Force importing results for scenario ${scenarioId}...`);
                    
                    // Use the service to perform the import
                    const result = await importService.importSimulationResults(action, {
                        documentId: documentId,
                        scenarioId: scenarioId,
                        collectionsToImport: collectionsToImport,
                        verboseLogging: loggingLevel >= LoggingLevel.VERBOSE
                    });
                    
                    if (result.success) {
                        // Update the scenarios_status.json file to mark results as imported
                        await updateResultsLastImported(documentId, scenarioId, logger);
                        logger.info(`Successfully imported results for scenario ${scenarioId}`);
                    } else {
                        logger.error(`Failed to import results for scenario ${scenarioId}: ${result.error || 'Unknown error'}`);
                    }
                } catch (parseError) {
                    logger.error(`Error parsing scenario ID ${compositeId}: ${parseError.message}`);
                }
            }
        } else {
            logger.info("No scenario results found");
        }

        logger.important("=== Hard Refresh Action Completed Successfully ===");
        return { success: true };

    } catch (error) {
        // Always log errors
        logger.error("=== Error in Hard Refresh Action ===");
        logger.error("Error details:", error);
        if (error instanceof Error) {
            logger.error("Error name:", error.name);
            logger.error("Error message:", error.message);
            logger.error("Error stack:", error.stack);
        }
        return { success: false };
    }
};