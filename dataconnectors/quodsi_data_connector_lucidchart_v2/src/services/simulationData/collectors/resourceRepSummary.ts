// services/simulationData/collectors/resourceRepSummary.ts
import { ResourceRepSummaryData } from '../../../collections/types/interfaces/ResourceRepSummaryData';
import { ResourceRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation - based on the actual CSV structure
export const requiredColumns = getRequiredColumnsFromType<ResourceRepSummaryData>([
    'id',
    'scenario_id',
    'scenario_name',
    'resource_id',
    'resource_name',
    'rep',
    'total_requests'
    // Only include the essential columns to allow for flexibility
]);

/**
 * Fetches resource rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID
 * @returns Array of resource rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ResourceRepSummaryData[]> {
    const baseBlobName = 'resource_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`
    conditionalLog(`[resourceRepSummary] Attempting to fetch resource rep summary data from: ${containerName}/${blobName}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<ResourceRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[resourceRepSummary] No data at root level, trying in results folder...`);

            const altBlobName = 'results/resource_rep_summary.csv';
            result = await fetchCsvData<ResourceRepSummaryData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[resourceRepSummary] Fetched ${result.length} resource rep summary records`);
        if (result.length > 0) {
            conditionalLog(`[resourceRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // No mapping is needed since we're using the same field names as the CSV
        // Just provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all fields
            const validItem: ResourceRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || 'Unknown'),
                scenario_name: String(item.scenario_name || "Unknown"),
                resource_id: String(item.resource_id || 'Unknown'),
                resource_name: String(item.resource_name || 'Unknown'),
                rep: item.rep || 0,
                // Capacity metrics
                capacity: item.capacity ?? 0,
                total_available_clock: item.total_available_clock ?? 0,
                // Usage metrics
                total_requests: item.total_requests ?? 0,
                successful_requests: item.successful_requests ?? 0,
                failed_requests: item.failed_requests ?? 0,
                times_acquired: item.times_acquired ?? 0,
                times_released: item.times_released ?? 0,
                // Time metrics
                total_time_in_use: item.total_time_in_use ?? 0,
                total_time_idle: item.total_time_idle ?? 0,
                total_blocking_time: item.total_blocking_time ?? 0,
                // Utilization metrics
                average_utilization: item.average_utilization ?? 0,
                peak_utilization: item.peak_utilization ?? 0,
                current_utilization: item.current_utilization ?? 0,
                // Performance metrics
                average_wait_time: item.average_wait_time ?? 0,
                max_wait_time: item.max_wait_time ?? 0,
                average_queue_length: item.average_queue_length ?? 0,
                max_queue_length: item.max_queue_length ?? 0,
                // Conflict metrics
                total_conflicts: item.total_conflicts ?? 0,
                conflict_frequency: item.conflict_frequency ?? 0
            };

            return validItem;
        });

        conditionalLog(`[resourceRepSummary] Validated and prepared ${validatedResult.length} resource rep summary records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[resourceRepSummary] Error fetching resource rep summary data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares resource rep summary data for Lucid update
 * @param data Array of resource rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ResourceRepSummaryData[]) {
    conditionalLog("[resourceRepSummary] Starting resource rep summary update preparation");
    conditionalLog(`[resourceRepSummary] Processing ${data.length} rows of resource rep summary data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            resource_id: String(item.resource_id || 'Unknown'),
            resource_name: String(item.resource_name || 'Unknown'),
            rep: item.rep || 0,
            // Capacity metrics
            capacity: item.capacity ?? 0,
            total_available_clock: item.total_available_clock ?? 0,
            // Usage metrics
            total_requests: item.total_requests ?? 0,
            successful_requests: item.successful_requests ?? 0,
            failed_requests: item.failed_requests ?? 0,
            times_acquired: item.times_acquired ?? 0,
            times_released: item.times_released ?? 0,
            // Time metrics
            total_time_in_use: item.total_time_in_use ?? 0,
            total_time_idle: item.total_time_idle ?? 0,
            total_blocking_time: item.total_blocking_time ?? 0,
            // Utilization metrics
            average_utilization: item.average_utilization ?? 0,
            peak_utilization: item.peak_utilization ?? 0,
            current_utilization: item.current_utilization ?? 0,
            // Performance metrics
            average_wait_time: item.average_wait_time ?? 0,
            max_wait_time: item.max_wait_time ?? 0,
            average_queue_length: item.average_queue_length ?? 0,
            max_queue_length: item.max_queue_length ?? 0,
            // Conflict metrics
            total_conflicts: item.total_conflicts ?? 0,
            conflict_frequency: item.conflict_frequency ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${item.id || 'Unknown'}"`, cleanedItem);
    });

    conditionalLog(`[resourceRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ResourceRepSummarySchema,
        patch: {
            items
        }
    };
}
