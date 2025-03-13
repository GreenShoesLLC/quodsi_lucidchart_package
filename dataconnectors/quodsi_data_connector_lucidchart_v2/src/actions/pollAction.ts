// actions/pollAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getRequiredContext } from "../utils/contextHelper";
import { getConfig } from "../config";
import { AzureStorageService, setStorageVerboseLogging } from "../services/azureStorageService";
import { initializeStorageService, getStorageService } from "../services/simulationData";
import {
    updateSimulationResults,
    getScenarioResultIds,
    parseScenarioResultId,
    createSimulationImportService
} from "../services";
import { ActionLogger } from "../utils/logging";
import { RunState } from "../types/documentStatus";

// Set to true to enable verbose logging for poll action
const POLL_ACTION_VERBOSE_LOGGING = true;

export const pollAction = async (action: DataConnectorAsynchronousAction) => {
    const logger = new ActionLogger('[PollAction]', POLL_ACTION_VERBOSE_LOGGING);

    try {
        logger.info("=== Poll Action Started ===");

        // Set up verbose logging for all components
        setStorageVerboseLogging(POLL_ACTION_VERBOSE_LOGGING);
        // IMPORTANT: Initialize storage service before using it
        // Get the config
        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);
        logger.info("Storage service initialized");
        // Step 1: Check for any ScenarioResultsSchema instances
        logger.info("Checking for scenario results...");
        const scenarioResultIds = await getScenarioResultIds(action, POLL_ACTION_VERBOSE_LOGGING, logger);
        const collectionsToImport: string[] = [];
        
        if (scenarioResultIds.length > 0) {
            logger.info(`Found ${scenarioResultIds.length} scenario results`);
            // Create an instance of the simulation import service
            const importService = createSimulationImportService(POLL_ACTION_VERBOSE_LOGGING);
            
            // Process each scenario result ID
            for (const compositeId of scenarioResultIds) {
                try {
                    // Parse the composite ID to get documentId and scenarioId
                    const { documentId, scenarioId } = parseScenarioResultId(compositeId);
                    logger.info(`Polling found scenario: documentId=${documentId}, scenarioId=${scenarioId}`);
                    
                    // Check if we need to import results for this scenario
                    const needsImport = await checkIfResultsNeedImporting(documentId, scenarioId, logger);
                    
                    if (needsImport) {
                        logger.info(`New results available for scenario ${scenarioId}, importing...`);
                        
                        // Use the service to perform the import
                        const result = await importService.importSimulationResults(action, {
                            documentId: documentId,
                            scenarioId: scenarioId,
                            collectionsToImport: collectionsToImport,
                            verboseLogging: POLL_ACTION_VERBOSE_LOGGING
                        });
                        
                        if (result.success) {
                            // Update the scenarios_status.json file to mark results as imported
                            await updateResultsLastImported(documentId, scenarioId, logger);
                            logger.info(`Successfully imported results for scenario ${scenarioId}`);
                        } else {
                            logger.error(`Failed to import results for scenario ${scenarioId}: ${result.error || 'Unknown error'}`);
                        }
                    } else {
                        logger.info(`No new results to import for scenario ${scenarioId}`);
                    }
                } catch (parseError) {
                    logger.error(`Error parsing scenario ID ${compositeId}: ${parseError.message}`);
                }
            }
        } else {
            logger.info("No scenario results found");
        }

        logger.info("=== Poll Action Completed Successfully ===");
        return { success: true };

    } catch (error) {
        // Always log errors
        logger.error("=== Error in Poll Action ===");
        logger.error("Error details:", error);
        if (error instanceof Error) {
            logger.error("Error name:", error.name);
            logger.error("Error message:", error.message);
            logger.error("Error stack:", error.stack);
        }
        return { success: false };
    }
};

/**
 * Check if a scenario has new results that need to be imported
 * @param documentId The document ID (container name)
 * @param scenarioId The scenario ID to check
 * @param logger Logger instance
 * @returns True if results need to be imported, false otherwise
 */
async function checkIfResultsNeedImporting(documentId: string, scenarioId: string, logger: ActionLogger): Promise<boolean> {
    try {
        const storageService = getStorageService();
        // Check if storage service is initialized
        if (!storageService) {
            logger.error("Storage service not available");
            // Re-initialize
            const config = getConfig();
            initializeStorageService(config.azureStorageConnectionString);
            logger.info("Re-initialized storage service");
        }
        // Get the scenarios_status.json file
        const statusJson = await storageService.getBlobContent(documentId, "scenarios_status.json");
        if (!statusJson) {
            logger.info(`scenarios_status.json not found for document ${documentId}`);
            return false;
        }
        
        // Parse the JSON
        const status = JSON.parse(statusJson);
        
        // Find the scenario
        const scenario = (status.scenarios || []).find((s: any) => s.id === scenarioId);
        if (!scenario) {
            logger.info(`Scenario ${scenarioId} not found in scenarios_status.json`);
            return false;
        }
        
        // Check if the scenario has completed successfully
        if (scenario.runState !== RunState.RanSuccessfully) {
            logger.info(`Scenario ${scenarioId} is in state ${scenario.runState}, not importing results`);
            return false;
        }
        
        // Check if results have been updated since last import
        if (!scenario.resultsLastUpdated) {
            logger.info(`Scenario ${scenarioId} has no resultsLastUpdated timestamp`);
            return false;
        }
        
        // If resultsLastImported is missing or older than resultsLastUpdated, we need to import
        if (!scenario.resultsLastImported || 
            new Date(scenario.resultsLastUpdated) > new Date(scenario.resultsLastImported)) {
            logger.info(`Scenario ${scenarioId} has new results (updated: ${scenario.resultsLastUpdated}, imported: ${scenario.resultsLastImported || 'never'})`);
            return true;
        }
        
        logger.info(`Scenario ${scenarioId} results are up to date`);
        return false;
    } catch (error) {
        logger.error(`Error checking if results need importing: ${error.message}`);
        // Default to false on error
        return false;
    }
}

/**
 * Update the resultsLastImported timestamp and reset resultsViewed flag in scenarios_status.json
 * @param documentId The document ID (container name)
 * @param scenarioId The scenario ID to update
 * @param logger Logger instance
 */
async function updateResultsLastImported(documentId: string, scenarioId: string, logger: ActionLogger): Promise<void> {
    try {
        const storageService = getStorageService();
        
        // Get the scenarios_status.json file
        const statusJson = await storageService.getBlobContent(documentId, "scenarios_status.json");
        if (!statusJson) {
            logger.error(`scenarios_status.json not found for document ${documentId}`);
            return;
        }
        
        // Parse the JSON
        const status = JSON.parse(statusJson);
        const currentTime = new Date().toISOString();
        
        // Find and update the scenario
        let scenarioFound = false;
        for (const scenario of (status.scenarios || [])) {
            if (scenario.id === scenarioId) {
                scenario.resultsLastImported = currentTime;
                scenario.resultsViewed = false; // Reset this flag since we have new results
                scenarioFound = true;
                break;
            }
        }
        
        if (!scenarioFound) {
            logger.warn(`Scenario ${scenarioId} not found in scenarios_status.json`);
            return;
        }
        
        // Update the lastUpdated timestamp for the whole file
        status.lastUpdated = currentTime;
        
        // Write back to blob storage
        await storageService.uploadBlobContent(
            documentId,
            "scenarios_status.json",
            JSON.stringify(status, null, 2)
        );
        
        logger.info(`Updated resultsLastImported for scenario ${scenarioId}`);
    } catch (error) {
        logger.error(`Error updating resultsLastImported: ${error.message}`);
    }
}