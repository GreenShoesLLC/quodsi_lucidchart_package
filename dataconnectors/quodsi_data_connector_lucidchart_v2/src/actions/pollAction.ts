// actions/pollAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { updateSimulationResults } from "../collections/simulationResultsService";
import { getRequiredContext } from "../utils/contextHelper";
import { getConfig } from "../config";
import { setStorageVerboseLogging } from "../services/azureStorageService";
import { initializeStorageService } from "../services/simulationData";

// Set to true to enable verbose logging for poll action
const POLL_ACTION_VERBOSE_LOGGING = false;

/**
 * Conditionally logs based on verbosity setting
 */
function pollLog(message: string, ...args: any[]) {
    if (POLL_ACTION_VERBOSE_LOGGING) {
        console.log(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 */
function pollError(message: string, ...args: any[]) {
    console.error(message, ...args);
}

export const pollAction = async (action: DataConnectorAsynchronousAction) => {
    try {
        // Only log start message if verbose logging is enabled
        pollLog("=== Poll Action Started ===");
        
        // Set up verbose logging for all components
        setStorageVerboseLogging(POLL_ACTION_VERBOSE_LOGGING);

        // Get validated context data
        const context = getRequiredContext(action);

        // If no context found, return success without doing anything
        if (!context) {
            pollLog("No valid context found, skipping poll update");
            return { success: true };
        }

        // Initialize Azure Storage Service
        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);

        // Use the simulation results service
        // Pass the verbosity setting so that updateSimulationResults can also respect it
        const result = await updateSimulationResults(
            action, 
            context.documentId, 
            context.userId, 
            'poll',
            POLL_ACTION_VERBOSE_LOGGING
        );

        pollLog("=== Poll Action Completed Successfully ===");
        return result;

    } catch (error) {
        // Always log errors
        pollError("=== Error in Poll Action ===");
        pollError("Error details:", error);
        if (error instanceof Error) {
            pollError("Error name:", error.name);
            pollError("Error message:", error.message);
            pollError("Error stack:", error.stack);
        }
        return { success: false };
    }
};