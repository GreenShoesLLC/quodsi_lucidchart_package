// services/simulationData/collectors/entityThroughputRepSummary.ts

import { EntityThroughputRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
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
 * @param scenarioId Scenario ID to use as folder prefix
 * @returns Array of entity throughput rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityThroughputRepSummaryData[]> {
    const baseBlobName = 'entity_throughput_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;

    conditionalLog(`[entityThroughputRepSummary] Attempting to fetch entity throughput data from: ${containerName}/${blobName}`);

    try {
        // Try first at the primary location (with scenarioId prefix)
        let result = await fetchCsvData<EntityThroughputRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        // If we didn't find any data, try in the results folder with scenarioId
        if (result.length === 0) {
            conditionalLog(`[entityThroughputRepSummary] No data at primary location, trying in results folder with scenarioId...`);
            
            const altBlobName = `${scenarioId}/results/${baseBlobName}`;
            result = await fetchCsvData<EntityThroughputRepSummaryData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
            
            // If still no data, try without scenarioId
            if (result.length === 0) {
                conditionalLog(`[entityThroughputRepSummary] No data in results folder with scenarioId, trying at root level...`);
                
                // Try at root level without scenarioId
                result = await fetchCsvData<EntityThroughputRepSummaryData>(
                    containerName,
                    baseBlobName,
                    documentId,
                    requiredColumns
                );
                
                // Try in results folder without scenarioId
                if (result.length === 0) {
                    conditionalLog(`[entityThroughputRepSummary] No data at root level, trying in results folder without scenarioId...`);
                    
                    const rootResultsBlobName = `results/${baseBlobName}`;
                    result = await fetchCsvData<EntityThroughputRepSummaryData>(
                        containerName,
                        rootResultsBlobName,
                        documentId,
                        requiredColumns
                    );
                }
            }
        }

        conditionalLog(`[entityThroughputRepSummary] Fetched ${result.length} entity throughput records`);
        if (result.length > 0) {
            conditionalLog(`[entityThroughputRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: EntityThroughputRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || 'Unknown'),
                scenario_name: String(item.scenario_name || "Unknown"),
                entity_id: String(item.entity_id || 'Unknown'),
                entity_name: String(item.entity_name || 'Unknown'),
                rep: item.rep || 0,
                count: item.count || 0,
                completed_count: item.completed_count || 0,
                in_progress_count: item.in_progress_count || 0,
                throughput_rate: item.throughput_rate || 0
            };

            return validItem;
        });

        conditionalLog(`[entityThroughputRepSummary] Validated and prepared ${validatedResult.length} entity throughput records`);

        return validatedResult;
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

        // Create a completely new object with ONLY the fields we need
        // Including our new synthetic ID field
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || 'Unknown'),
            entity_name: String(item.entity_name || 'Unknown'),
            rep: item.rep || 0,
            count: item.count || 0,
            completed_count: item.completed_count || 0,
            in_progress_count: item.in_progress_count || 0,
            throughput_rate: item.throughput_rate || 0
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
