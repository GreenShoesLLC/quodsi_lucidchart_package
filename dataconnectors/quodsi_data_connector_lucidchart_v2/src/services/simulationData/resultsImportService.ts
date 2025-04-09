import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ActionLogger } from '../../utils/logging';
import { conditionalLog, conditionalError } from '../../utils/loggingUtils';
import { getConfig } from "../../config";
// import { initializeStorageService } from "./dataAccessService";
// import * as simulationDataService from "./dataAccessService";
import { getDataCollectionConfig, DataCollectionConfig, isDataCollectionEnabled } from '../dataCollectionConfigService';
import { CollectionsUpdate } from '../collectionUpdateService';
import { LoggingLevel } from "../../utils/loggingLevels";
import { fetchActivityUtilization, prepareActivityUtilizationUpdate } from "./collectors/activityUtilizationCollector";
import { fetchActivityRepSummary, prepareActivityRepSummaryUpdate } from "./collectors/activityRepSummaryCollector";
import { fetchActivityTiming, prepareActivityTimingUpdate } from "./collectors/activityTimingCollector";
import { fetchEntityStateRepSummary, prepareEntityStateRepSummaryUpdate } from "./collectors/entityStateRepSummaryCollector";
import { fetchEntityThroughputRepSummary, prepareEntityThroughputRepSummaryUpdate } from "./collectors/entityThroughputRepSummaryCollector";
import { fetchResourceRepSummary, prepareResourceRepSummaryUpdate } from "./collectors/resourceRepSummaryCollector";
import { fetchResourceUtilization, prepareResourceUtilizationUpdate } from "./collectors/resourceUtilizationCollector";
import { fetchEntityStateCrossRepSummary, prepareEntityStateCrossRepSummaryUpdate } from "./collectors/entityStateCrossRepSummaryCollector";
import { fetchEntityThroughputCrossRepSummary, prepareEntityThroughputCrossRepSummaryUpdate } from "./collectors/entityThroughputCrossRepSummaryCollector";
import { initializeStorageService, setVerboseLogging } from "./storageService";

/**
 * Updates simulation results data in the simulation_results datasource
 * @param action The asynchronous action context
 * @param documentId Document ID containing the simulation results
 * @param scenarioId User ID who initiated the simulation
 * @param source Source identifier for the update
 * @param loggingLevel LoggingLevel to use, or boolean for backward compatibility
 * @param logger Optional logger instance
 * @returns Promise resolving with update status
 */
export async function updateSimulationResults(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    scenarioId: string,
    source: string = 'unknown',
    loggingLevel: LoggingLevel | boolean = LoggingLevel.NORMAL,
    logger?: ActionLogger,
    explicitContainerName?: string
) {
    // Handle backward compatibility with boolean parameter
    let logLevel: LoggingLevel;

    if (typeof loggingLevel === 'boolean') {
        logLevel = loggingLevel ? LoggingLevel.VERBOSE : LoggingLevel.MINIMAL;
    } else {
        logLevel = loggingLevel;
    }

    // Create a logger or use the provided one with a new child scope
    const log = logger ? logger.child('SimResults') : new ActionLogger('[SimResults]', logLevel);

    try {
        log.important(`=== Starting Simulation Results Update (Source: ${source}) ===`);
        log.info(`Document ID: ${documentId}, Scenario ID: ${scenarioId}`);

        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);

        // Tell simulation data service about verbosity (convert to boolean for backward compatibility)
        setVerboseLogging(logLevel >= LoggingLevel.VERBOSE);

        // Log the container we're using
        log.debug(`Using container: ${config.simulationResultsContainer}`);

        // IMPORTANT: Always use documentId as container name, not from config
        const containerName = explicitContainerName || documentId;
        log.important(`CONTAINER NAME FIX: Using container: ${containerName} (config value: ${config.simulationResultsContainer})`);

        // Log which collections are currently enabled
        log.debug('Current data collection configuration:', getDataCollectionConfig());

        // Create an array to track which data fetches succeeded and which failed
        const dataFetchResults = {
            activityUtilization: { success: false, count: 0, enabled: isDataCollectionEnabled('collectActivityUtilization') },
            activityRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('collectActivityRepSummary') },
            activityTiming: { success: false, count: 0, enabled: isDataCollectionEnabled('collectActivityTiming') },
            entityStateRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('collectEntityStateRepSummary') },
            entityThroughputRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('collectEntityThroughputRepSummary') },
            resourceRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('collectResourceRepSummary') },
            resourceUtilization: { success: false, count: 0, enabled: isDataCollectionEnabled('collectResourceUtilization') },
            // Add new cross-rep summary data types
            entityStateCrossRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('collectEntityStateCrossRepSummary') },
            entityThroughputCrossRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('collectEntityThroughputCrossRepSummary') }
        };

        // Initialize data holders
        let activityUtilization = [];
        let activityRepSummary = [];
        let activityTiming = [];
        let entityStateRepSummary = [];
        let entityThroughputRepSummary = [];
        let resourceRepSummary = [];
        let resourceUtilization = [];
        // Add new cross-rep summary data holders
        let entityStateCrossRepSummary = [];
        let entityThroughputCrossRepSummary = [];

        // Only fetch data for enabled collections
        // Activity Utilization
        if (isDataCollectionEnabled('collectActivityUtilization')) {
            try {
                log.info('Fetching activity utilization data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                activityUtilization = await fetchActivityUtilization(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.activityUtilization.success = true;
                dataFetchResults.activityUtilization.count = activityUtilization.length;
            } catch (error) {
                log.error(`Error fetching activity utilization data: ${error.message}`);
            }
        } else {
            log.debug('Activity utilization data collection is disabled');
        }

        // Activity Rep Summary
        if (isDataCollectionEnabled('collectActivityRepSummary')) {
            try {
                log.info('Fetching activity rep summary data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                activityRepSummary = await fetchActivityRepSummary(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.activityRepSummary.success = true;
                dataFetchResults.activityRepSummary.count = activityRepSummary.length;
            } catch (error) {
                log.error(`Error fetching activity rep summary data: ${error.message}`);
            }
        } else {
            log.debug('Activity rep summary data collection is disabled');
        }

        // Activity Timing
        if (isDataCollectionEnabled('collectActivityTiming')) {
            try {
                log.info('Fetching activity timing data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                activityTiming = await fetchActivityTiming(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.activityTiming.success = true;
                dataFetchResults.activityTiming.count = activityTiming.length;
            } catch (error) {
                log.error(`Error fetching activity timing data: ${error.message}`);
            }
        } else {
            log.debug('Activity timing data collection is disabled');
        }

        // Entity State Rep Summary
        if (isDataCollectionEnabled('collectEntityStateRepSummary')) {
            try {
                log.info('Fetching entity state rep summary data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                entityStateRepSummary = await fetchEntityStateRepSummary(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.entityStateRepSummary.success = true;
                dataFetchResults.entityStateRepSummary.count = entityStateRepSummary.length;
            } catch (error) {
                log.error(`Error fetching entity state rep summary data: ${error.message}`);
            }
        } else {
            log.debug('Entity state rep summary data collection is disabled');
        }

        // Entity Throughput Rep Summary - add extra logging for this problematic collection
        if (isDataCollectionEnabled('collectEntityThroughputRepSummary')) {
            try {
                log.info('Fetching entity throughput rep summary data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                // Now do the regular fetch
                entityThroughputRepSummary = await fetchEntityThroughputRepSummary(
                    containerName, documentId, scenarioId
                );

                dataFetchResults.entityThroughputRepSummary.success = true;
                dataFetchResults.entityThroughputRepSummary.count = entityThroughputRepSummary.length;
            } catch (error) {
                log.error(`Error fetching entity throughput rep summary data: ${error.message}`);
                log.error('Error stack:', error.stack);
            }
        } else {
            log.debug('Entity throughput rep summary data collection is disabled');
        }

        // Resource Rep Summary
        if (isDataCollectionEnabled('collectResourceRepSummary')) {
            try {
                log.info('Fetching resource rep summary data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                resourceRepSummary = await fetchResourceRepSummary(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.resourceRepSummary.success = true;
                dataFetchResults.resourceRepSummary.count = resourceRepSummary.length;
            } catch (error) {
                log.error(`Error fetching resource rep summary data: ${error.message}`);
            }
        } else {
            log.debug('Resource rep summary data collection is disabled');
        }

        // Resource Utilization
        if (isDataCollectionEnabled('collectResourceUtilization')) {
            try {
                log.info('Fetching resource utilization data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                resourceUtilization = await fetchResourceUtilization(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.resourceUtilization.success = true;
                dataFetchResults.resourceUtilization.count = resourceUtilization.length;
            } catch (error) {
                log.error(`Error fetching resource utilization data: ${error.message}`);
            }
        } else {
            log.debug('Resource utilization data collection is disabled');
        }

        // Entity State Cross Rep Summary - New
        if (isDataCollectionEnabled('collectEntityStateCrossRepSummary')) {
            try {
                log.info('Fetching entity state cross rep summary data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                entityStateCrossRepSummary = await fetchEntityStateCrossRepSummary(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.entityStateCrossRepSummary.success = true;
                dataFetchResults.entityStateCrossRepSummary.count = entityStateCrossRepSummary.length;
            } catch (error) {
                log.error(`Error fetching entity state cross rep summary data: ${error.message}`);
                log.error('Error stack:', error.stack);
            }
        } else {
            log.debug('Entity state cross rep summary data collection is disabled');
        }

        // Entity Throughput Cross Rep Summary - New
        if (isDataCollectionEnabled('collectEntityThroughputCrossRepSummary')) {
            try {
                log.info('Fetching entity throughput cross rep summary data...');
                log.info(`Using container: ${containerName} instead of config value: ${config.simulationResultsContainer}`);
                entityThroughputCrossRepSummary = await fetchEntityThroughputCrossRepSummary(
                    containerName, documentId, scenarioId
                );
                dataFetchResults.entityThroughputCrossRepSummary.success = true;
                dataFetchResults.entityThroughputCrossRepSummary.count = entityThroughputCrossRepSummary.length;
            } catch (error) {
                log.error(`Error fetching entity throughput cross rep summary data: ${error.message}`);
                log.error('Error stack:', error.stack);
            }
        } else {
            log.debug('Entity throughput cross rep summary data collection is disabled');
        }

        // Log summary of data fetch results
        log.info('=== Data Fetch Results Summary ===');
        Object.entries(dataFetchResults).forEach(([dataType, result]) => {
            log.info(`${dataType}: ${result.enabled ? 'ENABLED' : 'DISABLED'}, ${result.enabled ? (result.success ? 'SUCCESS' : 'FAILED') : 'SKIPPED'}, Count: ${result.count}`);
        });

        // Prepare all collection updates - only for enabled collections
        log.info('Preparing collection updates...');
        const updates: CollectionsUpdate = {};

        // Only add collections that are enabled
        if (isDataCollectionEnabled('collectActivityUtilization')) {
            updates["activity_utilization"] = prepareActivityUtilizationUpdate(activityUtilization);
        }

        if (isDataCollectionEnabled('collectActivityRepSummary')) {
            updates["activity_rep_summary"] = prepareActivityRepSummaryUpdate(activityRepSummary);
        }

        if (isDataCollectionEnabled('collectActivityTiming')) {
            updates["activity_timing"] = prepareActivityTimingUpdate(activityTiming);
        }

        if (isDataCollectionEnabled('collectEntityStateRepSummary')) {
            updates["entity_state_rep_summary"] = prepareEntityStateRepSummaryUpdate(entityStateRepSummary);
        }

        if (isDataCollectionEnabled('collectEntityThroughputRepSummary')) {
            updates["entity_throughput_rep_summary"] = prepareEntityThroughputRepSummaryUpdate(entityThroughputRepSummary);
            log.info(`Prepared entity_throughput_rep_summary update with ${updates["entity_throughput_rep_summary"].patch.items.size} items`);

            // Log the item keys if there are any - only in verbose mode
            if (updates["entity_throughput_rep_summary"].patch.items.size > 0 && logLevel >= LoggingLevel.VERBOSE) {
                const keys = Array.from(updates["entity_throughput_rep_summary"].patch.items.keys());
                log.debug(`Item keys: ${keys.join(', ')}`);
            }
        }

        if (isDataCollectionEnabled('collectResourceRepSummary')) {
            updates["resource_rep_summary"] = prepareResourceRepSummaryUpdate(resourceRepSummary);
        }

        if (isDataCollectionEnabled('collectResourceUtilization')) {
            updates["resource_utilization"] = prepareResourceUtilizationUpdate(resourceUtilization);
        }

        // Add the new cross-rep summary collections
        if (isDataCollectionEnabled('collectEntityStateCrossRepSummary')) {
            updates["entity_state_cross_rep_summary"] = prepareEntityStateCrossRepSummaryUpdate(entityStateCrossRepSummary);
            log.info(`Prepared entity_state_cross_rep_summary update with ${updates["entity_state_cross_rep_summary"].patch.items.size} items`);

            // Log the item keys if there are any - only in verbose mode
            if (updates["entity_state_cross_rep_summary"].patch.items.size > 0 && logLevel >= LoggingLevel.VERBOSE) {
                const keys = Array.from(updates["entity_state_cross_rep_summary"].patch.items.keys());
                log.debug(`Item keys: ${keys.join(', ')}`);
            }
        }

        if (isDataCollectionEnabled('collectEntityThroughputCrossRepSummary')) {
            updates["entity_throughput_cross_rep_summary"] = prepareEntityThroughputCrossRepSummaryUpdate(entityThroughputCrossRepSummary);
            log.info(`Prepared entity_throughput_cross_rep_summary update with ${updates["entity_throughput_cross_rep_summary"].patch.items.size} items`);

            // Log the item keys if there are any - only in verbose mode
            if (updates["entity_throughput_cross_rep_summary"].patch.items.size > 0 && logLevel >= LoggingLevel.VERBOSE) {
                const keys = Array.from(updates["entity_throughput_cross_rep_summary"].patch.items.keys());
                log.debug(`Item keys: ${keys.join(', ')}`);
            }
        }

        // Log prepared update item counts
        log.debug('=== Collection Update Item Counts ===');
        Object.entries(updates).forEach(([collectionName, update]) => {
            log.debug(`${collectionName}: ${update.patch.items.size} items`);
        });

        // Only proceed with update if we have collections to update
        if (Object.keys(updates).length === 0) {
            log.info('No collections enabled for update - skipping update to Lucid');
            return { success: true, collectionsUpdated: 0 };
        }

        // Send updates to Lucid
        log.info('Sending updates to Lucid...');

        try {
            await action.client.update({
                dataSourceName: "simulation_results",
                collections: updates
            });
            log.important('=== Updates sent successfully ===');
            return { success: true, collectionsUpdated: Object.keys(updates).length };
        } catch (updateError) {
            log.error(`Error during Lucid update: ${updateError.message}`);
            log.error('Error stack:', updateError.stack);
            throw updateError;
        }

    } catch (error) {
        log.error(`=== Error in Simulation Results Update (Source: ${source}) ===`);
        log.error('Error:', error);
        // Try to continue even if there's an error, return a partial success
        return { success: false, error: error.message };
    }
}