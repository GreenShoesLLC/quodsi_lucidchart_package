// services/simulationData/collectors/activityUtilization.ts
import { ActivityUtilizationSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { ActivityUtilizationData } from '../../../collections/types/interfaces/ActivityUtilizationData';

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
    documentId: string
): Promise<ActivityUtilizationData[]> {
    return fetchCsvData<ActivityUtilizationData>(
        containerName, 
        'activity_utilization.csv', 
        documentId,
        requiredColumns
    );
}

/**
 * Prepares activity utilization data for Lucid update
 * @param data Array of activity utilization data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityUtilizationData[]) {
    return prepareCollectionUpdate(data, ActivityUtilizationSchema, 'Id');
}
