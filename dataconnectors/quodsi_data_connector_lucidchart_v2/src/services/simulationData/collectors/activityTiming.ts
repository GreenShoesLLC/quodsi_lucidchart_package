import { ActivityTimingSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { ActivityTimingData } from '../../../collections/types/interfaces/ActivityTimingData';

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
    documentId: string
): Promise<ActivityTimingData[]> {
    return fetchCsvData<ActivityTimingData>(
        containerName, 
        'activity_timing.csv', 
        documentId,
        requiredColumns
    );
}

/**
 * Prepares activity timing data for Lucid update
 * @param data Array of activity timing data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityTimingData[]) {
    return prepareCollectionUpdate(data, ActivityTimingSchema, 'Id');
}
