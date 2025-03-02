// collections/simulationResultsService.ts
import { SerializedFields, DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ModelSchema } from "./modelSchema";
import { getConfig } from "../config";
import { initializeStorageService } from "../services/simulationDataService";
import * as simulationDataService from "../services/simulationDataService";

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

// Updated function to fetch and update all simulation results data
export async function updateSimulationResults(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    userId: string,
    source: string = 'unknown',
    verbose: boolean = true
) {
    try {
        conditionalLog(`=== Starting Simulation Results Update (Source: ${source}) ===`, verbose);
        
        const config = getConfig();
        initializeStorageService(config.azureStorageConnectionString);

        // Tell simulation data service about verbosity
        simulationDataService.setVerboseLogging(verbose);

        // Fetch all simulation result data in parallel
        const [
            activityUtilization,
            activityRepSummary,
            activityTiming,
            entityStateRepSummary,
            entityThroughputRepSummary,
            resourceRepSummary,
            completeActivityMetrics,
            customMetrics
        ] = await Promise.all([
            simulationDataService.fetchActivityUtilization(config.simulationResultsContainer, documentId),
            simulationDataService.fetchActivityRepSummary(config.simulationResultsContainer, documentId),
            simulationDataService.fetchActivityTiming(config.simulationResultsContainer, documentId),
            simulationDataService.fetchEntityStateRepSummary(config.simulationResultsContainer, documentId),
            simulationDataService.fetchEntityThroughputRepSummary(config.simulationResultsContainer, documentId),
            simulationDataService.fetchResourceRepSummary(config.simulationResultsContainer, documentId),
            simulationDataService.fetchCompleteActivityMetrics(config.simulationResultsContainer, documentId),
            simulationDataService.fetchCustomMetrics(config.simulationResultsContainer, documentId)
        ]);

        // Prepare all collection updates
        const updates: CollectionsUpdate = {
            "activity_utilization": 
                simulationDataService.prepareActivityUtilizationUpdate(activityUtilization),
            "activity_rep_summary": 
                simulationDataService.prepareActivityRepSummaryUpdate(activityRepSummary),
            "activity_timing": 
                simulationDataService.prepareActivityTimingUpdate(activityTiming),
            "entity_state_rep_summary": 
                simulationDataService.prepareEntityStateRepSummaryUpdate(entityStateRepSummary),
            "entity_throughput_rep_summary": 
                simulationDataService.prepareEntityThroughputRepSummaryUpdate(entityThroughputRepSummary),
            "resource_rep_summary": 
                simulationDataService.prepareResourceRepSummaryUpdate(resourceRepSummary),
            "complete_activity_metrics": 
                simulationDataService.prepareCompleteActivityMetricsUpdate(completeActivityMetrics),
            "custom_metrics": 
                simulationDataService.prepareCustomMetricsUpdate(customMetrics)
        };

        // Send updates to Lucid
        return await sendCollectionUpdates(action, updates, "simulation_results", verbose);

    } catch (error) {
        conditionalError(`=== Error in Simulation Results Update (Source: ${source}) ===`, error);
        throw error;
    }
}

// Model data update function
export async function updateModelData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    userId: string,
    pageId: string,
    verbose: boolean = true
): Promise<void> {
    if (!pageId) {
        throw new Error('pageId is required for model data');
    }

    const modelData = {
        documentId,
        userId,
        pageId
    };

    conditionalLog(`=== Updating Model Data (pageId: ${pageId}) ===`, verbose);

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

    conditionalLog(`=== Model Data Update Complete ===`, verbose);
}