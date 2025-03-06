// collections/simulationResultsService.ts
import { SerializedFields, DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ModelSchema } from "./modelSchema";
import { getConfig } from "../config";
import { initializeStorageService } from "../services/simulationDataService";
import * as simulationDataService from "../services/simulationDataService";
// Configuration for enabling/disabling specific data collections
export interface DataCollectionConfig {
    activityUtilization: boolean;
    activityRepSummary: boolean;
    activityTiming: boolean;
    entityStateRepSummary: boolean;
    entityThroughputRepSummary: boolean;
    resourceRepSummary: boolean;
    completeActivityMetrics: boolean;
    customMetrics: boolean;
}

// Default configuration - all collections enabled
const defaultDataCollectionConfig: DataCollectionConfig = {
    activityUtilization: false,
    activityRepSummary: false,
    activityTiming: false,
    entityStateRepSummary: true,
    entityThroughputRepSummary: false,
    resourceRepSummary: false,
    completeActivityMetrics: false,
    customMetrics: false
};

// Current active configuration - starts with defaults
let activeDataCollectionConfig: DataCollectionConfig = { ...defaultDataCollectionConfig };

/**
 * Set which data collections should be enabled/disabled
 * @param config Configuration specifying which collections to enable/disable
 */
export function setDataCollectionConfig(config: Partial<DataCollectionConfig>): void {
    // Only update the properties that are provided in the partial config
    activeDataCollectionConfig = {
        ...activeDataCollectionConfig,
        ...config
    };

    // Fixed conditionalLog call - pass true as the second parameter to indicate verbosity
    conditionalLog("Data collection configuration updated:", true, activeDataCollectionConfig);
}

/**
 * Reset data collection configuration to default (all enabled)
 */
export function resetDataCollectionConfig(): void {
    activeDataCollectionConfig = { ...defaultDataCollectionConfig };
    // Fixed conditionalLog call
    conditionalLog("Data collection configuration reset to defaults:", true, activeDataCollectionConfig);
}

// Also fix other instances of similar issues in the code:

conditionalLog('Current data collection configuration:', true, activeDataCollectionConfig);

/**
 * Get current data collection configuration
 */
export function getDataCollectionConfig(): DataCollectionConfig {
    return { ...activeDataCollectionConfig };
}

/**
 * Check if a specific data collection is enabled
 * @param collectionName Name of the collection to check
 */
export function isDataCollectionEnabled(collectionName: keyof DataCollectionConfig): boolean {
    return activeDataCollectionConfig[collectionName];
}

// Types
interface CollectionUpdate {
    schema: any;
    patch: {
        items: Map<string, SerializedFields>;
    };
}

interface CollectionsUpdate {
    [key: string]: CollectionUpdate;
}

/**
 * Conditionally logs based on verbosity setting
 */
function conditionalLog(message: string, verbose: boolean, ...args: any[]) {
    if (verbose) {
        console.log(message, ...args);
    }
}

/**
 * Error logs are always displayed regardless of verbosity setting
 */
function conditionalError(message: string, ...args: any[]) {
    console.error(message, ...args);
}

// Send updates to Lucid
export async function sendCollectionUpdates(
    action: DataConnectorAsynchronousAction,
    updates: CollectionsUpdate,
    dataSourceName: string = "simulation_results",
    verbose: boolean = true
): Promise<{ success: boolean }> {
    try {
        conditionalLog("=== Sending Updates to Lucid ===", verbose);
        await action.client.update({
            dataSourceName,
            collections: updates
        });
        conditionalLog("=== Updates Sent Successfully ===", verbose);
        return { success: true };
    } catch (error) {
        conditionalError("Error sending updates to Lucid:", error);
        throw error;
    }
}

// Updated functions in simulationResultsService.ts

// Add this import at the top of the file
import { ActionLogger } from '../utils/logging';

// Update the updateModelData function to accept a logger
export async function updateModelData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    userId: string,
    pageId: string,
    verbose: boolean = true,
    logger?: ActionLogger
): Promise<void> {
    // Create a local logger if none was provided
    const log = logger || new ActionLogger('[ModelData]', verbose);

    if (!pageId) {
        throw new Error('pageId is required for model data');
    }

    const modelData = {
        documentId,
        userId,
        pageId
    };

    log.info(`=== Updating Model Data (pageId: ${pageId}) ===`);

    await action.client.update({
        dataSourceName: "simulation_results",
        collections: {
            "Models": {
                schema: ModelSchema,
                patch: {
                    items: new Map([
                        [`"${pageId}"`, modelData]  // Ensure the key is properly quoted
                    ])
                }
            }
        }
    });

    log.info(`=== Model Data Update Complete ===`);
}

// Update updateSimulationResults to accept a logger
export async function updateSimulationResults(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    userId: string,
    source: string = 'unknown',
    verbose: boolean = true,
    logger?: ActionLogger
) {
    // Create a logger or use the provided one with a new child scope
    const log = logger ? logger.child('SimResults') : new ActionLogger('[SimResults]', verbose);

    try {
        log.info(`=== Starting Simulation Results Update (Source: ${source}) ===`);
        log.info(`Document ID: ${documentId}, User ID: ${userId}`);

        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);

        // Tell simulation data service about verbosity
        simulationDataService.setVerboseLogging(verbose);

        // Log the container we're using
        log.info(`Using container: ${config.simulationResultsContainer}`);

        // Log which collections are currently enabled
        log.info('Current data collection configuration:', activeDataCollectionConfig);

        // Create an array to track which data fetches succeeded and which failed
        const dataFetchResults = {
            activityUtilization: { success: false, count: 0, enabled: activeDataCollectionConfig.activityUtilization },
            activityRepSummary: { success: false, count: 0, enabled: activeDataCollectionConfig.activityRepSummary },
            activityTiming: { success: false, count: 0, enabled: activeDataCollectionConfig.activityTiming },
            entityStateRepSummary: { success: false, count: 0, enabled: activeDataCollectionConfig.entityStateRepSummary },
            entityThroughputRepSummary: { success: false, count: 0, enabled: activeDataCollectionConfig.entityThroughputRepSummary },
            resourceRepSummary: { success: false, count: 0, enabled: activeDataCollectionConfig.resourceRepSummary },
            completeActivityMetrics: { success: false, count: 0, enabled: activeDataCollectionConfig.completeActivityMetrics },
            customMetrics: { success: false, count: 0, enabled: activeDataCollectionConfig.customMetrics }
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
        if (activeDataCollectionConfig.activityUtilization) {
            try {
                log.info('Fetching activity utilization data...');
                activityUtilization = await simulationDataService.fetchActivityUtilization(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.activityRepSummary) {
            try {
                log.info('Fetching activity rep summary data...');
                activityRepSummary = await simulationDataService.fetchActivityRepSummary(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.activityTiming) {
            try {
                log.info('Fetching activity timing data...');
                activityTiming = await simulationDataService.fetchActivityTiming(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.entityStateRepSummary) {
            try {
                log.info('Fetching entity state rep summary data...');
                entityStateRepSummary = await simulationDataService.fetchEntityStateRepSummary(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.entityThroughputRepSummary) {
            try {
                log.info('Fetching entity throughput rep summary data...');

                // Log the exact path being used
                const fullPath = `${documentId}/entity_throughput_rep_summary.csv`;
                log.info(`Full blob path: ${config.simulationResultsContainer}/${fullPath}`);

                // Check if the file exists first
                const storageService = simulationDataService.getStorageService();
                const exists = await storageService.getBlobContent(
                    config.simulationResultsContainer,
                    fullPath
                );

                if (exists) {
                    log.info(`Entity throughput file exists! Content length: ${exists.length} bytes`);
                    log.info(`Preview: ${exists.substring(0, 100)}...`);

                    // Try to examine the file content
                    try {
                        const lines = exists.split('\n');
                        log.info(`CSV has ${lines.length} lines`);
                        if (lines.length > 0) {
                            log.info(`Headers: ${lines[0]}`);
                        }
                        if (lines.length > 1) {
                            log.info(`First data row: ${lines[1]}`);
                        }
                    } catch (parseError) {
                        log.error(`Error examining CSV content: ${parseError.message}`);
                    }
                } else {
                    log.warn(`Entity throughput file NOT found at path: ${fullPath}`);

                    // Try alternative path
                    const altPath = `${documentId}/results/entity_throughput_rep_summary.csv`;
                    log.info(`Trying alternative path: ${altPath}`);
                    const altContent = await storageService.getBlobContent(
                        config.simulationResultsContainer,
                        altPath
                    );

                    if (altContent) {
                        log.info(`Entity throughput file found at alternative path! Content length: ${altContent.length} bytes`);
                    } else {
                        log.warn(`Entity throughput file not found at alternative path either.`);
                    }
                }

                // Now do the regular fetch
                entityThroughputRepSummary = await simulationDataService.fetchEntityThroughputRepSummary(
                    config.simulationResultsContainer, documentId
                );

                log.info(`Entity throughput data loaded: ${entityThroughputRepSummary.length} rows`);
                if (entityThroughputRepSummary.length > 0) {
                    log.info('First row data:', entityThroughputRepSummary[0]);
                }

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
        if (activeDataCollectionConfig.resourceRepSummary) {
            try {
                log.info('Fetching resource rep summary data...');
                resourceRepSummary = await simulationDataService.fetchResourceRepSummary(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.completeActivityMetrics) {
            try {
                log.info('Fetching complete activity metrics data...');
                completeActivityMetrics = await simulationDataService.fetchCompleteActivityMetrics(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.customMetrics) {
            try {
                log.info('Fetching custom metrics data...');
                customMetrics = await simulationDataService.fetchCustomMetrics(
                    config.simulationResultsContainer, documentId
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
        if (activeDataCollectionConfig.activityUtilization) {
            updates["activity_utilization"] = simulationDataService.prepareActivityUtilizationUpdate(activityUtilization);
        }

        if (activeDataCollectionConfig.activityRepSummary) {
            updates["activity_rep_summary"] = simulationDataService.prepareActivityRepSummaryUpdate(activityRepSummary);
        }

        if (activeDataCollectionConfig.activityTiming) {
            updates["activity_timing"] = simulationDataService.prepareActivityTimingUpdate(activityTiming);
        }

        if (activeDataCollectionConfig.entityStateRepSummary) {
            updates["entity_state_rep_summary"] = simulationDataService.prepareEntityStateRepSummaryUpdate(entityStateRepSummary);
        }

        if (activeDataCollectionConfig.entityThroughputRepSummary) {
            updates["entity_throughput_rep_summary"] = simulationDataService.prepareEntityThroughputRepSummaryUpdate(entityThroughputRepSummary);
            log.info(`Prepared entity_throughput_rep_summary update with ${updates["entity_throughput_rep_summary"].patch.items.size} items`);

            // Log the item keys if there are any
            if (updates["entity_throughput_rep_summary"].patch.items.size > 0) {
                const keys = Array.from(updates["entity_throughput_rep_summary"].patch.items.keys());
                log.info(`Item keys: ${keys.join(', ')}`);
            }
        }

        if (activeDataCollectionConfig.resourceRepSummary) {
            updates["resource_rep_summary"] = simulationDataService.prepareResourceRepSummaryUpdate(resourceRepSummary);
        }

        if (activeDataCollectionConfig.completeActivityMetrics) {
            updates["complete_activity_metrics"] = simulationDataService.prepareCompleteActivityMetricsUpdate(completeActivityMetrics);
        }

        if (activeDataCollectionConfig.customMetrics) {
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