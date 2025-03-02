// actions/importSimulationResultsAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { updateSimulationResults, updateModelData } from "../collections/simulationResultsService";
import { getConfig } from "../config";
import { initializeStorageService } from "../services/simulationDataService";
import { setStorageVerboseLogging } from "../services/azureStorageService";

// Set to true to enable verbose logging for import action
const IMPORT_ACTION_VERBOSE_LOGGING = true;

/**
 * Conditionally logs based on verbosity setting
 */
function importLog(message: string, ...args: any[]) {
    if (IMPORT_ACTION_VERBOSE_LOGGING) {
        console.log(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 */
function importError(message: string, ...args: any[]) {
    console.error(message, ...args);
}

export const importSimulationResultsAction = async (action: DataConnectorAsynchronousAction) => {
    try {
        importLog("=== Import Simulation Results Action Started ===");
        
        // Set up verbose logging for all components
        setStorageVerboseLogging(IMPORT_ACTION_VERBOSE_LOGGING);

        // Get the data from action.data with required pageId
        const data = action.data as { documentId: string; userId: string; pageId: string };
        if (!data.pageId) {
            throw new Error('pageId is required for import action');
        }

        // Initialize Azure Storage Service
        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);

        // First, update the Models collection
        await updateModelData(action, data.documentId, data.userId, data.pageId);

        // Then proceed with simulation results update
        const result = await updateSimulationResults(
            action, 
            data.documentId, 
            data.userId, 
            'import',
            IMPORT_ACTION_VERBOSE_LOGGING
        );

        importLog("=== Import Simulation Results Action Completed Successfully ===");
        return result;

    } catch (error) {
        importError("=== Error in Import Simulation Results Action ===");
        importError("Error details:", error);
        if (error instanceof Error) {
            importError("Error name:", error.name);
            importError("Error message:", error.message);
            importError("Error stack:", error.stack);
        }
        return { success: false };
    }
};