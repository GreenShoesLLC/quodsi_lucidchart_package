// actions/getResourceCrossRepDataAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";
import { initializeStorageService } from "../services/simulationData";
import { fetchResourceCrossRep } from "../services/simulationData/collectors/resourceCrossRepCollector";

/**
 * Action to retrieve resource cross-replication summary data for a scenario
 * @param action The asynchronous action context
 * @returns Promise resolving with resource cross-rep data
 */
export const getResourceCrossRepDataAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetResourceCrossRepData]', loggingLevel);

    try {
        logger.important("=== Get Resource Cross-Rep Data Action Started ===");

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

        logger.info(`Fetching resource cross-rep data for scenario: ${data.scenarioId} in document: ${data.documentId}`);

        // Container name is the documentId
        const containerName = data.documentId;

        // Fetch resource cross-rep data using the existing collector
        const resourceData = await fetchResourceCrossRep(
            containerName,
            data.documentId,
            data.scenarioId
        );

        logger.info(`Retrieved ${resourceData.length} resource cross-rep records`);
        logger.important("=== Get Resource Cross-Rep Data Action Completed ===");

        return {
            success: true,
            data: resourceData,
            recordCount: resourceData.length
        };

    } catch (error) {
        logger.error("=== Error in Get Resource Cross-Rep Data Action ===");
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
