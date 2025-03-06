// services/simulationData/collectors/entityStateRepSummary.ts
import { EntityStateRepSummaryData } from '../../../collections/types/interfaces/EntityStateRepSummaryData';
import { EntityStateRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityStateRepSummaryData>([
    'rep', 'entity_type', 'count', 'avg_time_in_system', 'avg_time_waiting',
    'avg_time_blocked', 'avg_time_in_operation', 'avg_time_connecting',
    'percent_waiting', 'percent_blocked', 'percent_operation', 'percent_connecting'
]);

/**
 * Fetches entity state rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of entity state rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string
): Promise<EntityStateRepSummaryData[]> {
    const blobName = 'entity_state_rep_summary.csv';

    conditionalLog(`[entityStateRepSummary] Attempting to fetch entity state data from: ${containerName}/${blobName}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<EntityStateRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[entityStateRepSummary] No data at root level, trying in results folder...`);

            const altBlobName = 'results/entity_state_rep_summary.csv';
            result = await fetchCsvData<EntityStateRepSummaryData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[entityStateRepSummary] Fetched ${result.length} entity state records`);
        if (result.length > 0) {
            conditionalLog(`[entityStateRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: EntityStateRepSummaryData = {
                rep: item.rep || 0,
                entity_type: item.entity_type || 'Unknown',
                count: item.count || 0,
                avg_time_in_system: item.avg_time_in_system || 0,
                avg_time_waiting: item.avg_time_waiting || 0,
                avg_time_blocked: item.avg_time_blocked || 0,
                avg_time_in_operation: item.avg_time_in_operation || 0,
                avg_time_connecting: item.avg_time_connecting || 0,
                percent_waiting: item.percent_waiting || 0,
                percent_blocked: item.percent_blocked || 0,
                percent_operation: item.percent_operation || 0,
                percent_connecting: item.percent_connecting || 0
            };
            
            return validItem;
        });

        conditionalLog(`[entityStateRepSummary] Validated and prepared ${validatedResult.length} entity state records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[entityStateRepSummary] Error fetching entity state data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares entity state rep summary data for Lucid update
 * @param data Array of entity state rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: EntityStateRepSummaryData[]) {
    conditionalLog("[entityStateRepSummary] Starting entity state update preparation");
    conditionalLog(`[entityStateRepSummary] Processing ${data.length} rows of entity state data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityStateRepSummary] Processing item: ${JSON.stringify(item, null, 2)}`);

        // Create a synthetic ID field that combines entity_type and rep
        const id = `${item.entity_type}_${item.rep}`;

        // Create a completely new object with ONLY the fields we need
        // Including our new synthetic ID field, ensuring no null values
        const cleanedItem: SerializedFields = {
            id: id, // Add the ID field
            rep: item.rep || 0,
            entity_type: item.entity_type || 'Unknown',
            count: item.count || 0,
            avg_time_in_system: item.avg_time_in_system || 0,
            avg_time_waiting: item.avg_time_waiting || 0,
            avg_time_blocked: item.avg_time_blocked || 0,
            avg_time_in_operation: item.avg_time_in_operation || 0,
            avg_time_connecting: item.avg_time_connecting || 0,
            percent_waiting: item.percent_waiting || 0,
            percent_blocked: item.percent_blocked || 0,
            percent_operation: item.percent_operation || 0,
            percent_connecting: item.percent_connecting || 0
        };

        conditionalLog(`[entityStateRepSummary] Cleaned item with ID ${id}: ${JSON.stringify(cleanedItem, null, 2)}`);

        // Add to our collection using the ID as the key
        items.set(`"${id}"`, cleanedItem);
    });

    conditionalLog(`[entityStateRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: EntityStateRepSummarySchema,
        patch: {
            items
        }
    };
}
