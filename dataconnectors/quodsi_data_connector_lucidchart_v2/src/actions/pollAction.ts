// actions/pollAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getRequiredContext } from "../utils/contextHelper";
import { getConfig } from "../config";
import { setStorageVerboseLogging } from "../services/azureStorageService";
import { initializeStorageService } from "../services/simulationData";
import {
    updateSimulationResults,
    getScenarioResultIds,
    parseScenarioResultId
} from "../services";
import { ActionLogger } from "../utils/logging";

// Set to true to enable verbose logging for poll action
const POLL_ACTION_VERBOSE_LOGGING = true;

export const pollAction = async (action: DataConnectorAsynchronousAction) => {
    const logger = new ActionLogger('[PollAction]', POLL_ACTION_VERBOSE_LOGGING);

    try {
        logger.info("=== Poll Action Started ===");

        // Set up verbose logging for all components
        setStorageVerboseLogging(POLL_ACTION_VERBOSE_LOGGING);

        // Step 1: Check for any ScenarioResultsSchema instances
        logger.info("Checking for scenario results...");
        const scenarioResultIds = await getScenarioResultIds(action, POLL_ACTION_VERBOSE_LOGGING, logger);

        if (scenarioResultIds.length > 0) {
            logger.info(`Found ${scenarioResultIds.length} scenario results`);

            // Process each scenario result ID
            for (const compositeId of scenarioResultIds) {
                try {
                    // Parse the composite ID to get documentId and scenarioId
                    const { documentId, scenarioId } = parseScenarioResultId(compositeId);
                    logger.info(`Polling found scenario: documentId=${documentId}, scenarioId=${scenarioId}`);

                    // TODO: In the future, we would check Azure Storage for status updates
                    // and update the scenario state accordingly

                } catch (parseError) {
                    logger.error(`Error parsing scenario ID ${compositeId}: ${parseError.message}`);
                }
            }
        } else {
            logger.info("No scenario results found");
        }

        // Step 2: Continue with the existing simulation results update logic
        // Get validated context data for the older model
        const context = getRequiredContext(action);

        // If no context found, return success without doing anything for simulation results
        if (!context) {
            logger.info("No valid context found for simulation results, skipping update");
        } else {
            // Initialize Azure Storage Service
            const config = getConfig();
            initializeStorageService(config.azureStorageConnectionString);

            // Use the simulation results service
            logger.info("Updating simulation results for context:", context);
            const result = await updateSimulationResults(
                action,
                context.documentId,
                context.userId,
                'poll',
                POLL_ACTION_VERBOSE_LOGGING
            );
            logger.info("Simulation results update completed:", result);
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