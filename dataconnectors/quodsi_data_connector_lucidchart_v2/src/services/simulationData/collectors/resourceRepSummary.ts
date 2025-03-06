import { ResourceRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { ResourceRepSummaryData } from '../../../collections/types/interfaces/ResourceRepSummaryData';

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
    documentId: string
): Promise<ResourceRepSummaryData[]> {
    return fetchCsvData<ResourceRepSummaryData>(
        containerName, 
        'resource_rep_summary.csv', 
        documentId,
        requiredColumns
    );
}

/**
 * Prepares resource rep summary data for Lucid update
 * @param data Array of resource rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ResourceRepSummaryData[]) {
    // Using composite key
    return prepareCollectionUpdate(
        data, 
        ResourceRepSummarySchema, 
        (item: ResourceRepSummaryData) => `${item.rep}_${item.resource_id}`
    );
}
