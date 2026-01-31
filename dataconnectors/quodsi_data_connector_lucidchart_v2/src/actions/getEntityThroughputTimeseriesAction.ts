// actions/getEntityThroughputTimeseriesAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";
import { initializeStorageService } from "../services/simulationData";
import { fetchEntityThroughputTimeseries } from "../services/simulationData/collectors/entityThroughputTimeseriesCollector";

/**
 * Action to retrieve entity throughput timeseries cross-replication data for a scenario
 * @param action The asynchronous action context
 * @returns Promise resolving with entity throughput timeseries data
 */
export const getEntityThroughputTimeseriesAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetEntityThroughputTimeseries]', loggingLevel);

    try {
        logger.important("=== Get Entity Throughput Timeseries Action Started ===");

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

        logger.info(`Fetching entity throughput timeseries data for scenario: ${data.scenarioId} in document: ${data.documentId}`);

        // Container name is the documentId
        const containerName = data.documentId;

        // Fetch entity throughput timeseries data using the collector
        const timeseriesData = await fetchEntityThroughputTimeseries(
            containerName,
            data.documentId,
            data.scenarioId,
            'entity_throughput_timeseries_cross_rep.csv'
        );

        logger.info(`Retrieved ${timeseriesData.length} entity throughput timeseries records`);
        logger.important("=== Get Entity Throughput Timeseries Action Completed ===");

        return {
            success: true,
            data: timeseriesData,
            recordCount: timeseriesData.length
        };

    } catch (error) {
        logger.error("=== Error in Get Entity Throughput Timeseries Action ===");
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
