// services/simulationData/collectors/activityRepSummary.ts
import { ActivityRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { ActivityRepSummaryData } from '../../../collections/types/interfaces/ActivityRepSummaryData';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ActivityRepSummaryData>([
    'rep', 'activity_id', 'capacity', 'total_available_clock', 'total_arrivals',
    'total_requests', 'total_captures', 'total_releases', 'total_time_in_capture',
    'utilization_percentage', 'throughput_rate'
]);

/**
 * Fetches activity rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of activity rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string
): Promise<ActivityRepSummaryData[]> {
    const data = await fetchCsvData<ActivityRepSummaryData>(
        containerName,
        'activity_rep_summary.csv',
        documentId,
        requiredColumns
    );

    // Convert activity_id to string immediately after parsing
    return data.map(item => ({
        ...item,
        activity_id: String(item.activity_id)
    }));
}

/**
 * Prepares activity rep summary data for Lucid update
 * @param data Array of activity rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityRepSummaryData[]) {
    // Ensure activity_id is always a string
    const sanitizedData = data.map(item => ({
        ...item,
        activity_id: String(item.activity_id) // Explicitly convert to string
    }));

    // Using composite key for rep_summary
    return prepareCollectionUpdate(
        sanitizedData,
        ActivityRepSummarySchema,
        // Create a composite key from rep and activity_id 
        (item: ActivityRepSummaryData) => `${item.rep}_${item.activity_id}`
    );
}
