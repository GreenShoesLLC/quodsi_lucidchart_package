// services/simulationData/collectors/entityThroughputRepSummary.ts

import { EntityThroughputRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';
import { EntityThroughputRepSummaryData } from '../../../collections/types/interfaces/EntityThroughputRepSummaryData';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityThroughputRepSummaryData>([
    'id',
    'scenario_id',
    'scenario_name',
    'entity_id',
    'entity_name',
    'rep',
    'count',
    'completed_count',
    'in_progress_count',
    'throughput_rate'
]);

/**
 * Fetches entity throughput rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @returns Array of entity throughput rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityThroughputRepSummaryData[]> {
    const baseBlobName = 'entity_throughput_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`
    // The documentId IS the container name, so we don't include it in the path
    // We just look for the CSV file directly in the container root
    const fullPath = blobName;

    conditionalLog(`[entityThroughputRepSummary] Attempting to fetch entity throughput data from: ${containerName}/${fullPath}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<EntityThroughputRepSummaryData>(
            containerName,
            blobName,
            documentId, // Passing documentId for consistency, though not used in path construction anymore
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[entityThroughputRepSummary] No data at root level, trying in results folder...`);

            const altBlobName = 'results/entity_throughput_rep_summary.csv';
            result = await fetchCsvData<EntityThroughputRepSummaryData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        return result;
    } catch (error) {
        conditionalError(`[entityThroughputRepSummary] Error fetching entity throughput data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares entity throughput rep summary data for Lucid update
 * @param data Array of entity throughput rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: EntityThroughputRepSummaryData[]) {
    conditionalLog("[entityThroughputRepSummary] Starting entity throughput update preparation");
    conditionalLog(`[entityThroughputRepSummary] Processing ${data.length} rows of entity throughput data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityThroughputRepSummary] Processing item: ${JSON.stringify(item, null, 2)}`);

        // Create a synthetic ID field that combines entity_type and rep
        // const id = `${item.entity_type}_${item.rep}`;

        // Create a completely new object with ONLY the fields we need
        // Including our new synthetic ID field
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || 'Unknown'),
            entity_name: String(item.entity_name || 'Unknown'),
            rep: item.rep,
            count: item.count,
            completed_count: item.completed_count,
            in_progress_count: item.in_progress_count,
            throughput_rate: item.throughput_rate
        };

        conditionalLog(`[entityThroughputRepSummary] Cleaned item with ID ${item.id}: ${JSON.stringify(cleanedItem, null, 2)}`);

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityThroughputRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: EntityThroughputRepSummarySchema,
        patch: {
            items
        }
    };
}
