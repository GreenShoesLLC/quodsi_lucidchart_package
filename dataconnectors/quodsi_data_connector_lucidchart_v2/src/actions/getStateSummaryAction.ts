// actions/getStateSummaryAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";
import { initializeStorageService } from "../services/simulationData";
import { fetchStateSummary } from "../services/simulationData/collectors/stateSummaryCollector";

/**
 * Action to retrieve state summary cross-replication data for a scenario
 * @param action The asynchronous action context
 * @returns Promise resolving with state summary data
 */
export const getStateSummaryAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetStateSummary]', loggingLevel);

    try {
        logger.important("=== Get State Summary Action Started ===");

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

        logger.info(`Fetching state summary data for scenario: ${data.scenarioId} in document: ${data.documentId}`);

        // Container name is the documentId
        const containerName = data.documentId;

        // Fetch state summary data using the collector
        const stateSummaryData = await fetchStateSummary(
            containerName,
            data.documentId,
            data.scenarioId
        );

        logger.info(`Retrieved ${stateSummaryData.length} state summary records`);
        logger.important("=== Get State Summary Action Completed ===");

        return {
            success: true,
            data: stateSummaryData,
            recordCount: stateSummaryData.length
        };

    } catch (error) {
        logger.error("=== Error in Get State Summary Action ===");
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
