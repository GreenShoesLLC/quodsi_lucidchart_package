import { ActivityCrossRepSummaryData, ActivityRepSummaryData, EntityCrossRepSummaryData, EntityRepSummaryData, ResourceCrossRepData, ResourceRepSummaryData } from "../../collections/types/interfaces";

import { DataCollectionConfig, isDataCollectionEnabled } from "../dataCollectionConfigService";
import { fetchActivityCrossRep, prepareActivityCrossRepUpdate } from "./collectors/activityCrossRepCollector";
import { fetchActivityRepSummary, prepareActivityRepSummaryUpdate } from "./collectors/activityRepSummaryCollector";

import { fetchEntityCrossRep, prepareEntityCrossRepUpdate } from "./collectors/entityCrossRepCollector";
import { fetchEntityRep, prepareEntityRepUpdate } from "./collectors/entityRepCollector";

import { fetchResourceCrossRep, prepareResourceCrossRepUpdate } from "./collectors/resourceCrossRepCollector";
import { fetchResourceRepSummary, prepareResourceRepSummaryUpdate } from "./collectors/resourceRepSummaryCollector";

import { conditionalError, conditionalLog } from "./storageService";

// Define a generic collector type
interface CollectorConfig<T> {
    key: string;
    fetchFn: (containerName: string, documentId: string, scenarioId: string) => Promise<T[]>;
    prepareFn: (data: T[]) => any;
    configFlag: keyof DataCollectionConfig;
}

/**
 * Generic function to fetch data using a collector
 */
async function fetchCollectorData<T>(
    collector: CollectorConfig<T>,
    containerName: string,
    documentId: string,
    scenarioId: string,
    dataFetchResults: Map<string, any[]>
): Promise<T[]> {
    const configEnabled = isDataCollectionEnabled(collector.configFlag);

    if (!configEnabled) {
        conditionalLog(`[updateResults] ${collector.key} collection disabled by config`);
        return [];
    }

    try {
        conditionalLog(`[updateResults] Fetching ${collector.key} data...`);
        const data = await collector.fetchFn(containerName, documentId, scenarioId);
        conditionalLog(`[updateResults] Fetched ${data.length} ${collector.key} records`);

        // Store in results map
        dataFetchResults.set(collector.key, data);

        return data;
    } catch (error) {
        conditionalError(`[updateResults] Error fetching ${collector.key} data: ${error.message}`);
        return [];
    }
}

/**
 * Generic function to prepare collection update
 */
function prepareCollectionUpdate<T>(
    collector: CollectorConfig<T>,
    data: T[],
    updates: { [key: string]: any }
): void {
    const configEnabled = isDataCollectionEnabled(collector.configFlag);

    if (!configEnabled) {
        conditionalLog(`[updateResults] ${collector.key} preparation disabled by config`);
        return;
    }

    if (data.length > 0) {
        updates[collector.key] = collector.prepareFn(data);
        conditionalLog(`[updateResults] Added ${collector.key} update with ${data.length} records`);
    }
}

// Main function with updated signature to include action context
export async function updateSimulationResults(
    action: any, // Lucid action context
    documentId: string,
    scenarioId: string,
    mode: string,
    loggingLevel: string,
    logger: any,
    containerName: string
): Promise<{ [key: string]: any }> {
    // Set up logging based on parameters
    conditionalLog(`[updateResults] Starting simulation results update for scenario ${scenarioId}`, true);
    conditionalLog(`[updateResults] Mode: ${mode}, Logging: ${loggingLevel}`);
    
    const dataFetchResults = new Map<string, any[]>();
    const updates: { [key: string]: any } = {};

    const activityRepSummaryCollector: CollectorConfig<ActivityRepSummaryData> = {
        key: "activity_rep_summary",
        fetchFn: fetchActivityRepSummary,
        prepareFn: prepareActivityRepSummaryUpdate,
        configFlag: "collectActivityRepSummary"
    };

    const activityCrossRepCollector: CollectorConfig<ActivityCrossRepSummaryData> = {
        key: "activity_cross_rep",
        fetchFn: fetchActivityCrossRep,
        prepareFn: prepareActivityCrossRepUpdate,
        configFlag: "collectActivityCrossRep"
    };

    const resourceRepSummaryCollector: CollectorConfig<ResourceRepSummaryData> = {
        key: "resource_rep_summary",
        fetchFn: fetchResourceRepSummary,
        prepareFn: prepareResourceRepSummaryUpdate,
        configFlag: "collectResourceRepSummary"
    };

    const resourceCrossRepCollector: CollectorConfig<ResourceCrossRepData> = {
        key: "resource_cross_rep",
        fetchFn: fetchResourceCrossRep,
        prepareFn: prepareResourceCrossRepUpdate,
        configFlag: "collectResourceCrossRep"
    };

    const entityRepCollector: CollectorConfig<EntityRepSummaryData> = {
        key: "entity_rep",
        fetchFn: fetchEntityRep,
        prepareFn: prepareEntityRepUpdate,
        configFlag: "collectEntityRep"
    };

    const entityCrossRepCollector: CollectorConfig<EntityCrossRepSummaryData> = {
        key: "entity_cross_rep",
        fetchFn: fetchEntityCrossRep,
        prepareFn: prepareEntityCrossRepUpdate,
        configFlag: "collectEntityCrossRep"
    };

    try {
        // Activity collectors
        let activityRepSummary = await fetchCollectorData(
            activityRepSummaryCollector, containerName, documentId, scenarioId, dataFetchResults
        );
        prepareCollectionUpdate(activityRepSummaryCollector, activityRepSummary, updates);

        let activityCrossRep = await fetchCollectorData(
            activityCrossRepCollector, containerName, documentId, scenarioId, dataFetchResults
        );
        prepareCollectionUpdate(activityCrossRepCollector, activityCrossRep, updates);

        // Resource collectors
        let resourceRepSummary = await fetchCollectorData(
            resourceRepSummaryCollector, containerName, documentId, scenarioId, dataFetchResults
        );
        prepareCollectionUpdate(resourceRepSummaryCollector, resourceRepSummary, updates);

        let resourceCrossRep = await fetchCollectorData(
            resourceCrossRepCollector, containerName, documentId, scenarioId, dataFetchResults
        );
        prepareCollectionUpdate(resourceCrossRepCollector, resourceCrossRep, updates);

        // Entity collectors
        let entityRep = await fetchCollectorData(
            entityRepCollector, containerName, documentId, scenarioId, dataFetchResults
        );
        prepareCollectionUpdate(entityRepCollector, entityRep, updates);

        let entityCrossRep = await fetchCollectorData(
            entityCrossRepCollector, containerName, documentId, scenarioId, dataFetchResults
        );
        prepareCollectionUpdate(entityCrossRepCollector, entityCrossRep, updates);

        // Update collections in Lucid if we have any updates
        conditionalLog(`[updateResults] Prepared ${Object.keys(updates).length} collection updates`);
        if (Object.keys(updates).length > 0) {
            conditionalLog(`[updateResults] Updating collections in Lucid...`);
            await action.client.update({
                dataSourceName: "simulation_results",
                collections: updates
            });
            conditionalLog(`[updateResults] Collections updated successfully`);
        } else {
            conditionalLog(`[updateResults] No updates to apply to collections`);
        }

        return updates;
    } catch (error) {
        conditionalError(`[updateResults] Error during simulation results update: ${error.message}`);
        throw error;
    }
}