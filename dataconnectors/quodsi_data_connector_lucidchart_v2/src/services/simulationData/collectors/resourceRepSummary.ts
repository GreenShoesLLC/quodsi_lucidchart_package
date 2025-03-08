// services/simulationData/collectors/resourceRepSummary.ts
import { ResourceRepSummaryData } from '../../../collections/types/interfaces/ResourceRepSummaryData';
import { ResourceRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ResourceRepSummaryData>([
    'rep', 'resource_id', 'total_requests', 'total_captures', 'total_releases'
]);

/**
 * Fetches resource rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
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

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Ensure resource_id is a string
            const resourceId = String(item.resource_id || 'unknown_resource');

            // Create a composite ID
            const id = `${item.rep || 0}_${resourceId}`;

            // Create a new object with defaults for all required fields
            const validItem: ResourceRepSummaryData = {
                id,
                rep: item.rep || 0,
                resource_id: resourceId,
                total_requests: item.total_requests ?? 0,
                total_captures: item.total_captures ?? 0,
                total_releases: item.total_releases ?? 0,
                avg_capture_time: item.avg_capture_time ?? 0,
                utilization_rate: item.utilization_rate ?? 0,
                total_time_waiting: item.total_time_waiting ?? 0,
                avg_queue_time: item.avg_queue_time ?? 0,
                max_queue_length: item.max_queue_length ?? 0,
                avg_contents: item.avg_contents ?? 0
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
        // Ensure resource_id is a string
        const resourceId = String(item.resource_id || 'unknown_resource');

        // Create a composite key
        const id = item.id || `${item.rep || 0}_${resourceId}`;

        conditionalLog(`[resourceRepSummary] Processing item with ID ${id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id,
            rep: item.rep || 0,
            resource_id: resourceId,
            total_requests: item.total_requests ?? 0,
            total_captures: item.total_captures ?? 0,
            total_releases: item.total_releases ?? 0,
            avg_capture_time: item.avg_capture_time ?? 0,
            utilization_rate: item.utilization_rate ?? 0,
            total_time_waiting: item.total_time_waiting ?? 0,
            avg_queue_time: item.avg_queue_time ?? 0,
            max_queue_length: item.max_queue_length ?? 0,
            avg_contents: item.avg_contents ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
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
