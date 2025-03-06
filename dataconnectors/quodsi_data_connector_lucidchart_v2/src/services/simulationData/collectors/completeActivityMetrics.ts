import { CompleteActivityMetricsSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { CompleteActivityMetricsData } from '../../../collections/types/interfaces/CompleteActivityMetricsData';

// For CompleteActivityMetrics, we'll just require the ID and Name columns as a minimum
// since it has a very large number of columns
export const requiredColumns = getRequiredColumnsFromType<CompleteActivityMetricsData>([
    'Id', 'Name'
]);

/**
 * Fetches complete activity metrics data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of complete activity metrics data
 */
export async function fetchData(
    containerName: string,
    documentId: string
): Promise<CompleteActivityMetricsData[]> {
    return fetchCsvData<CompleteActivityMetricsData>(
        containerName, 
        'complete_activity_metrics.csv', 
        documentId,
        requiredColumns
    );
}

/**
 * Prepares complete activity metrics data for Lucid update
 * @param data Array of complete activity metrics data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: CompleteActivityMetricsData[]) {
    return prepareCollectionUpdate(data, CompleteActivityMetricsSchema, 'Id');
}
