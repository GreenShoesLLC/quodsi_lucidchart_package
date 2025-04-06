// utils/simulationResultsUtils.ts
import { getConfig } from "../config";
import { getStorageService, initializeStorageService } from "../services/simulationData";
import { ActionLogger } from "./logging";
import { RunState } from "../types/documentStatus";

/**
 * Check if a scenario has new results that need to be imported
 * @param documentId The document ID (container name)
 * @param scenarioId The scenario ID to check
 * @param logger Logger instance
 * @returns True if results need to be imported, false otherwise
 */
export async function checkIfResultsNeedImporting(documentId: string, scenarioId: string, logger: ActionLogger): Promise<boolean> {
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
export async function updateResultsLastImported(documentId: string, scenarioId: string, logger: ActionLogger): Promise<void> {
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