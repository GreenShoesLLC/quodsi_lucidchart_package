// services/simulationData/collectors/customMetrics.ts
import { CustomMetricsSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { CustomMetricsData } from '../../../collections/types/interfaces/CustomMetricsData';

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
    return fetchCsvData<CustomMetricsData>(
        containerName, 
        'custom_metrics.csv', 
        documentId,
        requiredColumns
    );
}

/**
 * Prepares custom metrics data for Lucid update
 * @param data Array of custom metrics data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: CustomMetricsData[]) {
    return prepareCollectionUpdate(data, CustomMetricsSchema, 'Id');
}
