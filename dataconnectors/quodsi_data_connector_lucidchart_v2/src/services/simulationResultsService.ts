import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ActionLogger } from '../utils/logging';
import { conditionalLog, conditionalError } from '../utils/loggingUtils';
import { getConfig } from "../config";
import { initializeStorageService } from "./simulationDataService";
import * as simulationDataService from "./simulationDataService";
import { getDataCollectionConfig, DataCollectionConfig, isDataCollectionEnabled } from './dataCollectionConfigService';
import { CollectionsUpdate } from './collectionUpdateService';

/**
 * Updates simulation results data in the simulation_results datasource
 * @param action The asynchronous action context
 * @param documentId Document ID containing the simulation results
 * @param scenarioId User ID who initiated the simulation
 * @param source Source identifier for the update
 * @param verbose Whether to log verbose output
 * @param logger Optional logger instance
 * @returns Promise resolving with update status
 */
export async function updateSimulationResults(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    scenarioId: string,
    source: string = 'unknown',
    verbose: boolean = true,
    logger?: ActionLogger
) {
    // Create a logger or use the provided one with a new child scope
    const log = logger ? logger.child('SimResults') : new ActionLogger('[SimResults]', verbose);

    try {
        log.info(`=== Starting Simulation Results Update (Source: ${source}) ===`);
        log.info(`Document ID: ${documentId}, Scenario ID: ${scenarioId}`);

        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);

        // Tell simulation data service about verbosity
        simulationDataService.setVerboseLogging(verbose);

        // Log the container we're using
        log.info(`Using container: ${config.simulationResultsContainer}`);

        // Log which collections are currently enabled
        log.info('Current data collection configuration:', getDataCollectionConfig());

        // Create an array to track which data fetches succeeded and which failed
        const dataFetchResults = {
            activityUtilization: { success: false, count: 0, enabled: isDataCollectionEnabled('activityUtilization') },
            activityRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('activityRepSummary') },
            activityTiming: { success: false, count: 0, enabled: isDataCollectionEnabled('activityTiming') },
            entityStateRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('entityStateRepSummary') },
            entityThroughputRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('entityThroughputRepSummary') },
            resourceRepSummary: { success: false, count: 0, enabled: isDataCollectionEnabled('resourceRepSummary') },
            completeActivityMetrics: { success: false, count: 0, enabled: isDataCollectionEnabled('completeActivityMetrics') },
            customMetrics: { success: false, count: 0, enabled: isDataCollectionEnabled('customMetrics') }
        };

        // Initialize data holders
        let activityUtilization = [];
        let activityRepSummary = [];
        let activityTiming = [];
        let entityStateRepSummary = [];
        let entityThroughputRepSummary = [];
        let resourceRepSummary = [];
        let completeActivityMetrics = [];
        let customMetrics = [];

        // Only fetch data for enabled collections
        // Activity Utilization
        if (isDataCollectionEnabled('activityUtilization')) {
            try {
                log.info('Fetching activity utilization data...');
                activityUtilization = await simulationDataService.fetchActivityUtilization(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.activityUtilization.success = true;
                dataFetchResults.activityUtilization.count = activityUtilization.length;
            } catch (error) {
                log.error(`Error fetching activity utilization data: ${error.message}`);
            }
        } else {
            log.info('Activity utilization data collection is disabled');
        }

        // Activity Rep Summary
        if (isDataCollectionEnabled('activityRepSummary')) {
            try {
                log.info('Fetching activity rep summary data...');
                activityRepSummary = await simulationDataService.fetchActivityRepSummary(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.activityRepSummary.success = true;
                dataFetchResults.activityRepSummary.count = activityRepSummary.length;
            } catch (error) {
                log.error(`Error fetching activity rep summary data: ${error.message}`);
            }
        } else {
            log.info('Activity rep summary data collection is disabled');
        }

        // Activity Timing
        if (isDataCollectionEnabled('activityTiming')) {
            try {
                log.info('Fetching activity timing data...');
                activityTiming = await simulationDataService.fetchActivityTiming(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.activityTiming.success = true;
                dataFetchResults.activityTiming.count = activityTiming.length;
            } catch (error) {
                log.error(`Error fetching activity timing data: ${error.message}`);
            }
        } else {
            log.info('Activity timing data collection is disabled');
        }

        // Entity State Rep Summary
        if (isDataCollectionEnabled('entityStateRepSummary')) {
            try {
                log.info('Fetching entity state rep summary data...');
                entityStateRepSummary = await simulationDataService.fetchEntityStateRepSummary(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.entityStateRepSummary.success = true;
                dataFetchResults.entityStateRepSummary.count = entityStateRepSummary.length;
            } catch (error) {
                log.error(`Error fetching entity state rep summary data: ${error.message}`);
            }
        } else {
            log.info('Entity state rep summary data collection is disabled');
        }

        // Entity Throughput Rep Summary - add extra logging for this problematic collection
        if (isDataCollectionEnabled('entityThroughputRepSummary')) {
            try {
                log.info('Fetching entity throughput rep summary data...');
                // Now do the regular fetch
                entityThroughputRepSummary = await simulationDataService.fetchEntityThroughputRepSummary(
                    config.simulationResultsContainer, documentId, scenarioId
                );

                dataFetchResults.entityThroughputRepSummary.success = true;
                dataFetchResults.entityThroughputRepSummary.count = entityThroughputRepSummary.length;
            } catch (error) {
                log.error(`Error fetching entity throughput rep summary data: ${error.message}`);
                log.error('Error stack:', error.stack);
            }
        } else {
            log.info('Entity throughput rep summary data collection is disabled');
        }

        // Resource Rep Summary
        if (isDataCollectionEnabled('resourceRepSummary')) {
            try {
                log.info('Fetching resource rep summary data...');
                resourceRepSummary = await simulationDataService.fetchResourceRepSummary(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.resourceRepSummary.success = true;
                dataFetchResults.resourceRepSummary.count = resourceRepSummary.length;
            } catch (error) {
                log.error(`Error fetching resource rep summary data: ${error.message}`);
            }
        } else {
            log.info('Resource rep summary data collection is disabled');
        }

        // Complete Activity Metrics
        if (isDataCollectionEnabled('completeActivityMetrics')) {
            try {
                log.info('Fetching complete activity metrics data...');
                completeActivityMetrics = await simulationDataService.fetchCompleteActivityMetrics(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.completeActivityMetrics.success = true;
                dataFetchResults.completeActivityMetrics.count = completeActivityMetrics.length;
            } catch (error) {
                log.error(`Error fetching complete activity metrics data: ${error.message}`);
            }
        } else {
            log.info('Complete activity metrics data collection is disabled');
        }

        // Custom Metrics
        if (isDataCollectionEnabled('customMetrics')) {
            try {
                log.info('Fetching custom metrics data...');
                customMetrics = await simulationDataService.fetchCustomMetrics(
                    config.simulationResultsContainer, documentId, scenarioId
                );
                dataFetchResults.customMetrics.success = true;
                dataFetchResults.customMetrics.count = customMetrics.length;
            } catch (error) {
                log.error(`Error fetching custom metrics data: ${error.message}`);
            }
        } else {
            log.info('Custom metrics data collection is disabled');
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
        if (isDataCollectionEnabled('activityUtilization')) {
            updates["activity_utilization"] = simulationDataService.prepareActivityUtilizationUpdate(activityUtilization);
        }

        if (isDataCollectionEnabled('activityRepSummary')) {
            updates["activity_rep_summary"] = simulationDataService.prepareActivityRepSummaryUpdate(activityRepSummary);
        }

        if (isDataCollectionEnabled('activityTiming')) {
            updates["activity_timing"] = simulationDataService.prepareActivityTimingUpdate(activityTiming);
        }

        if (isDataCollectionEnabled('entityStateRepSummary')) {
            updates["entity_state_rep_summary"] = simulationDataService.prepareEntityStateRepSummaryUpdate(entityStateRepSummary);
        }

        if (isDataCollectionEnabled('entityThroughputRepSummary')) {
            updates["entity_throughput_rep_summary"] = simulationDataService.prepareEntityThroughputRepSummaryUpdate(entityThroughputRepSummary);
            log.info(`Prepared entity_throughput_rep_summary update with ${updates["entity_throughput_rep_summary"].patch.items.size} items`);

            // Log the item keys if there are any
            if (updates["entity_throughput_rep_summary"].patch.items.size > 0) {
                const keys = Array.from(updates["entity_throughput_rep_summary"].patch.items.keys());
                log.info(`Item keys: ${keys.join(', ')}`);
            }
        }

        if (isDataCollectionEnabled('resourceRepSummary')) {
            updates["resource_rep_summary"] = simulationDataService.prepareResourceRepSummaryUpdate(resourceRepSummary);
        }

        if (isDataCollectionEnabled('completeActivityMetrics')) {
            updates["complete_activity_metrics"] = simulationDataService.prepareCompleteActivityMetricsUpdate(completeActivityMetrics);
        }

        if (isDataCollectionEnabled('customMetrics')) {
            updates["custom_metrics"] = simulationDataService.prepareCustomMetricsUpdate(customMetrics);
        }

        // Log prepared update item counts
        log.info('=== Collection Update Item Counts ===');
        Object.entries(updates).forEach(([collectionName, update]) => {
            log.info(`${collectionName}: ${update.patch.items.size} items`);
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
            log.info('=== Updates sent successfully ===');
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
