// actions/getSimulationRunCrossRepDataAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";
import { initializeStorageService } from "../services/simulationData";
import { fetchScenarioCrossRep } from "../services/simulationData/collectors/scenarioCrossRepCollector";

/**
 * Action to retrieve simulation run cross-replication summary data
 * @param action The asynchronous action context
 * @returns Promise resolving with simulation run cross-rep data
 */
export const getSimulationRunCrossRepDataAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetSimulationRunCrossRepData]', loggingLevel);

    try {
        logger.important("=== Get Simulation Run Cross-Rep Data Action Started ===");

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

        logger.info(`Fetching simulation run cross-rep data for scenario: ${data.scenarioId} in document: ${data.documentId}`);

        // Container name is the documentId
        const containerName = data.documentId;

        // Fetch scenario cross-rep data using the collector
        const scenarioData = await fetchScenarioCrossRep(
            containerName,
            data.documentId,
            data.scenarioId
        );

        logger.info(`Retrieved ${scenarioData.length} simulation run cross-rep records`);
        logger.important("=== Get Simulation Run Cross-Rep Data Action Completed ===");

        return {
            success: true,
            data: scenarioData,
            recordCount: scenarioData.length
        };

    } catch (error) {
        logger.error("=== Error in Get Simulation Run Cross-Rep Data Action ===");
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
