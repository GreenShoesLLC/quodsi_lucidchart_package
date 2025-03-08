// services/simulationData/collectors/activityUtilization.ts
import { ActivityUtilizationData } from '../../../collections/types/interfaces/ActivityUtilizationData';
import { ActivityUtilizationSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ActivityUtilizationData>([
    'Id', 'Name', 'utilization_mean', 'utilization_max', 'utilization_std_dev',
    'capacity_mean', 'capacity_max', 'capacity_std_dev',
    'contents_mean', 'contents_max', 'contents_std_dev',
    'queue_length_mean', 'queue_length_max', 'queue_length_std_dev'
]);

/**
 * Fetches activity utilization data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of activity utilization data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityUtilizationData[]> {

    const baseBlobName = 'activity_utilization.csv';
    const blobName = `${scenarioId}/${baseBlobName}`
    conditionalLog(`[activityUtilization] Attempting to fetch activity utilization data from: ${containerName}/${blobName}`);
    
    try {
        // Try first at the root level
        let result = await fetchCsvData<ActivityUtilizationData>(
            containerName, 
            blobName, 
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[activityUtilization] No data at root level, trying in results folder...`);

            const altBlobName = 'results/activity_utilization.csv';
            result = await fetchCsvData<ActivityUtilizationData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[activityUtilization] Fetched ${result.length} activity utilization records`);
        if (result.length > 0) {
            conditionalLog(`[activityUtilization] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: ActivityUtilizationData = {
                Id: item.Id || `activity_${Math.random().toString(36).substring(2, 10)}`,
                Name: item.Name || 'Unknown Activity',
                utilization_mean: item.utilization_mean ?? 0,
                utilization_max: item.utilization_max ?? 0,
                utilization_std_dev: item.utilization_std_dev ?? 0,
                capacity_mean: item.capacity_mean ?? 0,
                capacity_max: item.capacity_max ?? 0,
                capacity_std_dev: item.capacity_std_dev ?? 0,
                contents_mean: item.contents_mean ?? 0,
                contents_max: item.contents_max ?? 0,
                contents_std_dev: item.contents_std_dev ?? 0,
                queue_length_mean: item.queue_length_mean ?? 0,
                queue_length_max: item.queue_length_max ?? 0,
                queue_length_std_dev: item.queue_length_std_dev ?? 0
            };
            
            return validItem;
        });

        conditionalLog(`[activityUtilization] Validated and prepared ${validatedResult.length} activity utilization records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityUtilization] Error fetching activity utilization data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares activity utilization data for Lucid update
 * @param data Array of activity utilization data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityUtilizationData[]) {
    conditionalLog("[activityUtilization] Starting activity utilization update preparation");
    conditionalLog(`[activityUtilization] Processing ${data.length} rows of activity utilization data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Ensure ID is never null or undefined
        const id = item.Id || `activity_${Math.random().toString(36).substring(2, 10)}`;
        
        conditionalLog(`[activityUtilization] Processing item with ID ${id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            Id: id,
            Name: item.Name || 'Unknown Activity',
            utilization_mean: item.utilization_mean ?? 0,
            utilization_max: item.utilization_max ?? 0,
            utilization_std_dev: item.utilization_std_dev ?? 0,
            capacity_mean: item.capacity_mean ?? 0,
            capacity_max: item.capacity_max ?? 0,
            capacity_std_dev: item.capacity_std_dev ?? 0,
            contents_mean: item.contents_mean ?? 0,
            contents_max: item.contents_max ?? 0,
            contents_std_dev: item.contents_std_dev ?? 0,
            queue_length_mean: item.queue_length_mean ?? 0,
            queue_length_max: item.queue_length_max ?? 0,
            queue_length_std_dev: item.queue_length_std_dev ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
    });

    conditionalLog(`[activityUtilization] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ActivityUtilizationSchema,
        patch: {
            items
        }
    };
}
