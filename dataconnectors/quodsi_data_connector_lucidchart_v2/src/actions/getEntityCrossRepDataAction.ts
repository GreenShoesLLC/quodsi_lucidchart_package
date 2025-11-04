// actions/getEntityCrossRepDataAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";
import { initializeStorageService } from "../services/simulationData";
import { fetchEntityCrossRep } from "../services/simulationData/collectors/entityCrossRepCollector";

/**
 * Action to retrieve entity cross-replication summary data for a scenario
 * @param action The asynchronous action context
 * @returns Promise resolving with entity cross-rep data
 */
export const getEntityCrossRepDataAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetEntityCrossRepData]', loggingLevel);

    try {
        logger.important("=== Get Entity Cross-Rep Data Action Started ===");

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

        logger.info(`Fetching entity cross-rep data for scenario: ${data.scenarioId} in document: ${data.documentId}`);

        // Container name is the documentId
        const containerName = data.documentId;

        // Fetch entity cross-rep data using the existing collector
        const entityData = await fetchEntityCrossRep(
            containerName,
            data.documentId,
            data.scenarioId
        );

        logger.info(`Retrieved ${entityData.length} entity cross-rep records`);
        logger.important("=== Get Entity Cross-Rep Data Action Completed ===");

        return {
            success: true,
            data: entityData,
            recordCount: entityData.length
        };

    } catch (error) {
        logger.error("=== Error in Get Entity Cross-Rep Data Action ===");
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
