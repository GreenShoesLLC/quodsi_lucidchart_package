// services/simulationData/collectors/customMetrics.ts
import { CustomMetricsData } from '../../../collections/types/interfaces/CustomMetricsData';
import { CustomMetricsSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<CustomMetricsData>([
    'Id', 'Name', 'utilization_mean', 'throughput_mean', 'bottleneck_frequency'
]);

/**
 * Fetches custom metrics data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of custom metrics data
 */
export async function fetchData(
    containerName: string,
    documentId: string
): Promise<CustomMetricsData[]> {
    const blobName = 'custom_metrics.csv';

    conditionalLog(`[customMetrics] Attempting to fetch custom metrics data from: ${containerName}/${blobName}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<CustomMetricsData>(
            containerName, 
            blobName, 
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[customMetrics] No data at root level, trying in results folder...`);

            const altBlobName = 'results/custom_metrics.csv';
            result = await fetchCsvData<CustomMetricsData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[customMetrics] Fetched ${result.length} custom metrics records`);
        if (result.length > 0) {
            conditionalLog(`[customMetrics] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: CustomMetricsData = {
                Id: item.Id || `metric_${Math.random().toString(36).substring(2, 10)}`,
                Name: item.Name || 'Unknown Metric',
                utilization_mean: item.utilization_mean ?? 0,
                utilization_std_dev: item.utilization_std_dev ?? 0,
                throughput_mean: item.throughput_mean ?? 0,
                throughput_std_dev: item.throughput_std_dev ?? 0,
                bottleneck_frequency: item.bottleneck_frequency ?? 0
            };
            
            return validItem;
        });

        conditionalLog(`[customMetrics] Validated and prepared ${validatedResult.length} custom metrics records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[customMetrics] Error fetching custom metrics data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares custom metrics data for Lucid update
 * @param data Array of custom metrics data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: CustomMetricsData[]) {
    conditionalLog("[customMetrics] Starting custom metrics update preparation");
    conditionalLog(`[customMetrics] Processing ${data.length} rows of custom metrics data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Ensure ID is never null or undefined
        const id = item.Id || `metric_${Math.random().toString(36).substring(2, 10)}`;
        
        conditionalLog(`[customMetrics] Processing item with ID ${id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            Id: id,
            Name: item.Name || 'Unknown Metric',
            utilization_mean: item.utilization_mean ?? 0,
            utilization_std_dev: item.utilization_std_dev ?? 0,
            throughput_mean: item.throughput_mean ?? 0,
            throughput_std_dev: item.throughput_std_dev ?? 0,
            bottleneck_frequency: item.bottleneck_frequency ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
    });

    conditionalLog(`[customMetrics] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: CustomMetricsSchema,
        patch: {
            items
        }
    };
}
