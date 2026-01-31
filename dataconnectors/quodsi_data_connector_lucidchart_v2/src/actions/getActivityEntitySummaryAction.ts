// actions/getActivityEntitySummaryAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";
import { initializeStorageService } from "../services/simulationData";
import { fetchActivityEntitySummary } from "../services/simulationData/collectors/activityEntitySummaryCollector";

/**
 * Action to retrieve activity entity summary data for a scenario
 * @param action The asynchronous action context
 * @returns Promise resolving with activity entity summary data
 */
export const getActivityEntitySummaryAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetActivityEntitySummary]', loggingLevel);

    try {
        logger.important("=== Get Activity Entity Summary Action Started ===");

        // Initialize storage service
        initializeStorageService(config.azureStorageConnectionString);
        logger.info("Storage service initialized");

        const data = action.data as {
            documentId: string;
            scenarioId: string;
        };

        // Validate required parameters
        if (!data.documentId) {
            logger.error("Missing documentId");
            return {
                success: false,
                error: "documentId is required"
            };
        }

        if (!data.scenarioId) {
            logger.error("Missing scenarioId");
            return {
                success: false,
                error: "scenarioId is required"
            };
        }

        logger.info(`Fetching activity entity summary data for scenario: ${data.scenarioId} in document: ${data.documentId}`);

        // Container name is the documentId
        const containerName = data.documentId;

        // Fetch activity entity summary data using the collector
        const activityEntityData = await fetchActivityEntitySummary(
            containerName,
            data.documentId,
            data.scenarioId
        );

        logger.info(`Retrieved ${activityEntityData.length} activity entity summary records`);
        logger.important("=== Get Activity Entity Summary Action Completed ===");

        return {
            success: true,
            data: activityEntityData,
            recordCount: activityEntityData.length
        };

    } catch (error) {
        logger.error("=== Error in Get Activity Entity Summary Action ===");
        logger.error(`Error details: ${error.message}`);
        if (error.stack) {
            logger.error(`Stack trace: ${error.stack}`);
        }

        return {
            success: false,
            error: error.message
        };
    }
};
