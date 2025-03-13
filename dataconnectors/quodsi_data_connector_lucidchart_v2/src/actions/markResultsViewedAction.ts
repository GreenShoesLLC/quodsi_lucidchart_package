// actions/markResultsViewedAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getStorageService } from "../services/simulationData";
import { ActionLogger } from "../utils/logging";

// Set to true to enable verbose logging for mark results viewed action
const MARK_RESULTS_VIEWED_VERBOSE_LOGGING = true;

/**
 * Action to mark scenario results as viewed by the user
 * @param action The asynchronous action context
 * @returns Promise resolving with success status
 */
export const markResultsViewedAction = async (action: DataConnectorAsynchronousAction) => {
    const logger = new ActionLogger('[MarkResultsViewedAction]', MARK_RESULTS_VIEWED_VERBOSE_LOGGING);

    try {
        logger.info("=== Mark Results Viewed Action Started ===");

        // Extract request data
        const data = action.data as {
            documentId: string;
            scenarioId?: string; // Optional - if not provided, mark all scenarios as viewed
        };

        if (!data.documentId) {
            logger.error("Missing required documentId");
            return { success: false };
        }

        logger.info(`Marking results as viewed for document: ${data.documentId}, scenario: ${data.scenarioId || 'ALL'}`);

        // Get the storage service
        const storageService = getStorageService();

        // Get the scenarios_status.json file
        const statusJson = await storageService.getBlobContent(data.documentId, "scenarios_status.json");
        if (!statusJson) {
            logger.error(`scenarios_status.json not found for document ${data.documentId}`);
            return { success: false };
        }

        // Parse the JSON
        const status = JSON.parse(statusJson);
        const currentTime = new Date().toISOString();
        let scenariosUpdated = 0;

        // Update the scenario(s)
        for (const scenario of (status.scenarios || [])) {
            // If scenarioId is provided, only update that scenario
            // Otherwise, update all scenarios that have unviewed results
            if (!data.scenarioId || scenario.id === data.scenarioId) {
                // Only update if resultsViewed is false
                if (scenario.resultsViewed === false) {
                    scenario.resultsViewed = true;
                    scenariosUpdated++;
                    logger.info(`Marked scenario ${scenario.id} as viewed`);
                }
            }
        }

        if (scenariosUpdated === 0) {
            logger.info(`No scenarios were updated`);
            return { success: true, scenariosUpdated };
        }

        // Update the lastUpdated timestamp for the whole file
        status.lastUpdated = currentTime;

        // Write back to blob storage
        await storageService.uploadBlobContent(
            data.documentId,
            "scenarios_status.json",
            JSON.stringify(status, null, 2)
        );

        logger.info(`Updated ${scenariosUpdated} scenarios as viewed`);
        logger.info("=== Mark Results Viewed Action Completed Successfully ===");

        return { 
            success: true,
            scenariosUpdated
        };

    } catch (error) {
        // Always log errors
        logger.error("=== Error in Mark Results Viewed Action ===");
        logger.error("Error details:", error);
        if (error instanceof Error) {
            logger.error("Error name:", error.name);
            logger.error("Error message:", error.message);
            logger.error("Error stack:", error.stack);
        }
        return { success: false };
    }
};