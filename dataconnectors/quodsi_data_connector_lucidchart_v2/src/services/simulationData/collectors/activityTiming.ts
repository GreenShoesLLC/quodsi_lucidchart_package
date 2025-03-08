// services/simulationData/collectors/activityTiming.ts
import { ActivityTimingData } from '../../../collections/types/interfaces/ActivityTimingData';
import { ActivityTimingSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ActivityTimingData>([
    'Id', 'Name', 'cycle_time_mean', 'cycle_time_median', 'cycle_time_std_dev',
    'service_time_mean', 'waiting_time_mean', 'blocked_time_mean'
]);

/**
 * Fetches activity timing data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of activity timing data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityTimingData[]> {
    const baseBlobName = 'activity_timing.csv';
    const blobName = `${scenarioId}/${baseBlobName}`
    conditionalLog(`[activityTiming] Attempting to fetch activity timing data from: ${containerName}/${blobName}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<ActivityTimingData>(
            containerName, 
            blobName, 
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[activityTiming] No data at root level, trying in results folder...`);

            const altBlobName = 'results/activity_timing.csv';
            result = await fetchCsvData<ActivityTimingData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[activityTiming] Fetched ${result.length} activity timing records`);
        if (result.length > 0) {
            conditionalLog(`[activityTiming] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: ActivityTimingData = {
                Id: item.Id || `activity_${Math.random().toString(36).substring(2, 10)}`,
                Name: item.Name || 'Unknown Activity',
                cycle_time_mean: item.cycle_time_mean ?? 0,
                cycle_time_median: item.cycle_time_median ?? 0,
                cycle_time_cv: item.cycle_time_cv ?? 0,
                cycle_time_std_dev: item.cycle_time_std_dev ?? 0,
                service_time_mean: item.service_time_mean ?? 0,
                service_time_median: item.service_time_median ?? 0,
                service_time_cv: item.service_time_cv ?? 0,
                service_time_std_dev: item.service_time_std_dev ?? 0,
                waiting_time_mean: item.waiting_time_mean ?? 0,
                waiting_time_median: item.waiting_time_median ?? 0,
                waiting_time_cv: item.waiting_time_cv ?? 0,
                waiting_time_std_dev: item.waiting_time_std_dev ?? 0,
                blocked_time_mean: item.blocked_time_mean ?? 0,
                blocked_time_median: item.blocked_time_median ?? 0,
                blocked_time_cv: item.blocked_time_cv ?? 0,
                blocked_time_std_dev: item.blocked_time_std_dev ?? 0
            };
            
            return validItem;
        });

        conditionalLog(`[activityTiming] Validated and prepared ${validatedResult.length} activity timing records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityTiming] Error fetching activity timing data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares activity timing data for Lucid update
 * @param data Array of activity timing data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityTimingData[]) {
    conditionalLog("[activityTiming] Starting activity timing update preparation");
    conditionalLog(`[activityTiming] Processing ${data.length} rows of activity timing data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Ensure ID is never null or undefined
        const id = item.Id || `activity_${Math.random().toString(36).substring(2, 10)}`;
        
        conditionalLog(`[activityTiming] Processing item with ID ${id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            Id: id,
            Name: item.Name || 'Unknown Activity',
            cycle_time_mean: item.cycle_time_mean ?? 0,
            cycle_time_median: item.cycle_time_median ?? 0,
            cycle_time_cv: item.cycle_time_cv ?? 0,
            cycle_time_std_dev: item.cycle_time_std_dev ?? 0,
            service_time_mean: item.service_time_mean ?? 0,
            service_time_median: item.service_time_median ?? 0,
            service_time_cv: item.service_time_cv ?? 0,
            service_time_std_dev: item.service_time_std_dev ?? 0,
            waiting_time_mean: item.waiting_time_mean ?? 0,
            waiting_time_median: item.waiting_time_median ?? 0,
            waiting_time_cv: item.waiting_time_cv ?? 0,
            waiting_time_std_dev: item.waiting_time_std_dev ?? 0,
            blocked_time_mean: item.blocked_time_mean ?? 0,
            blocked_time_median: item.blocked_time_median ?? 0,
            blocked_time_cv: item.blocked_time_cv ?? 0,
            blocked_time_std_dev: item.blocked_time_std_dev ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
    });

    conditionalLog(`[activityTiming] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ActivityTimingSchema,
        patch: {
            items
        }
    };
}
