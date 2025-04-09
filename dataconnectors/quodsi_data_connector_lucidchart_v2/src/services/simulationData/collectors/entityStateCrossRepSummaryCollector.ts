// services/simulationData/collectors/entityStateCrossRepSummary.ts
import { EntityStateCrossRepSummaryData } from '../../../collections/types/interfaces/EntityStateCrossRepSummaryData';
import { EntityStateCrossRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType, blobExists } from '../csvParser';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityStateCrossRepSummaryData>([
    'id',
    'scenario_id',
    'scenario_name',
    'entity_id',
    'entity_name',
    'count_mean',
    'count_median',
    'count_std_dev',
    'time_in_system_mean',
    'time_in_system_median',
    'time_in_system_std_dev',
    'time_waiting_mean',
    'time_waiting_median',
    'time_waiting_std_dev',
    'time_blocked_mean',
    'time_blocked_median',
    'time_blocked_std_dev',
    'time_in_operation_mean',
    'time_in_operation_median',
    'time_in_operation_std_dev',
    'time_connecting_mean',
    'time_connecting_median',
    'time_connecting_std_dev',
    'percent_waiting_mean',
    'percent_waiting_std_dev',
    'percent_blocked_mean',
    'percent_blocked_std_dev',
    'percent_operation_mean',
    'percent_operation_std_dev',
    'percent_connecting_mean',
    'percent_connecting_std_dev'
]);

/**
 * Fetches entity state cross rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID to use as folder prefix
 * @returns Array of entity state cross rep summary data
 */
export async function fetchEntityStateCrossRepSummary(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityStateCrossRepSummaryData[]> {
    const baseBlobName = 'entity_state_cross_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;

    conditionalLog(`[entityStateCrossRepSummary] Attempting to fetch data from: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists at the primary location
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[entityStateCrossRepSummary] File does not exist at primary location: ${containerName}/${blobName}`);

            // Try in the results folder
            const altBlobName = `${scenarioId}/results/${baseBlobName}`;
            const altExists = await blobExists(containerName, altBlobName);

            if (altExists) {
                conditionalLog(`[entityStateCrossRepSummary] Found file in results folder: ${containerName}/${altBlobName}`);
                const result = await fetchCsvData<EntityStateCrossRepSummaryData>(
                    containerName,
                    altBlobName,
                    documentId,
                    requiredColumns
                );

                conditionalLog(`[entityStateCrossRepSummary] Fetched ${result.length} records from results folder`);
                return validateData(result);
            }

            conditionalWarn(`[entityStateCrossRepSummary] Could not find entity state cross rep summary data in any location`);
            return [];
        }

        // Fetch the data from the primary location
        const result = await fetchCsvData<EntityStateCrossRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityStateCrossRepSummary] Fetched ${result.length} entity state cross rep summary records`);
        if (result.length > 0) {
            conditionalLog(`[entityStateCrossRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        return validateData(result);
    } catch (error) {
        conditionalError(`[entityStateCrossRepSummary] Error fetching entity state cross rep summary data: ${error.message}`);
        throw error;
    }
}

/**
 * Validates and provides defaults for entity state cross rep summary data
 * @param data Raw data from CSV
 * @returns Validated data with defaults for missing fields
 */
function validateData(data: EntityStateCrossRepSummaryData[]): EntityStateCrossRepSummaryData[] {
    return data.map(item => {
        // Create a new object with defaults for all required fields
        const validItem: EntityStateCrossRepSummaryData = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || 'Unknown'),
            entity_name: String(item.entity_name || 'Unknown'),
            count_mean: item.count_mean || 0,
            count_median: item.count_median || 0,
            count_std_dev: item.count_std_dev || 0,
            time_in_system_mean: item.time_in_system_mean || 0,
            time_in_system_median: item.time_in_system_median || 0,
            time_in_system_std_dev: item.time_in_system_std_dev || 0,
            time_waiting_mean: item.time_waiting_mean || 0,
            time_waiting_median: item.time_waiting_median || 0,
            time_waiting_std_dev: item.time_waiting_std_dev || 0,
            time_blocked_mean: item.time_blocked_mean || 0,
            time_blocked_median: item.time_blocked_median || 0,
            time_blocked_std_dev: item.time_blocked_std_dev || 0,
            time_in_operation_mean: item.time_in_operation_mean || 0,
            time_in_operation_median: item.time_in_operation_median || 0,
            time_in_operation_std_dev: item.time_in_operation_std_dev || 0,
            time_connecting_mean: item.time_connecting_mean || 0,
            time_connecting_median: item.time_connecting_median || 0,
            time_connecting_std_dev: item.time_connecting_std_dev || 0,
            percent_waiting_mean: item.percent_waiting_mean || 0,
            percent_waiting_std_dev: item.percent_waiting_std_dev || 0,
            percent_blocked_mean: item.percent_blocked_mean || 0,
            percent_blocked_std_dev: item.percent_blocked_std_dev || 0,
            percent_operation_mean: item.percent_operation_mean || 0,
            percent_operation_std_dev: item.percent_operation_std_dev || 0,
            percent_connecting_mean: item.percent_connecting_mean || 0,
            percent_connecting_std_dev: item.percent_connecting_std_dev || 0
        };

        return validItem;
    });
}

/**
 * Prepares entity state cross rep summary data for Lucid update
 * @param data Array of entity state cross rep summary data
 * @returns Collection update for Lucid
 */
export function prepareEntityStateCrossRepSummaryUpdate(data: EntityStateCrossRepSummaryData[]) {
    conditionalLog("[entityStateCrossRepSummary] Starting entity state cross rep summary update preparation");
    conditionalLog(`[entityStateCrossRepSummary] Processing ${data.length} rows of entity state cross rep summary data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityStateCrossRepSummary] Processing item: ${JSON.stringify(item, null, 2)}`);

        // Create a cleaned item with only the fields we need
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || 'Unknown'),
            entity_name: String(item.entity_name || 'Unknown'),
            count_mean: item.count_mean || 0,
            count_median: item.count_median || 0,
            count_std_dev: item.count_std_dev || 0,
            time_in_system_mean: item.time_in_system_mean || 0,
            time_in_system_median: item.time_in_system_median || 0,
            time_in_system_std_dev: item.time_in_system_std_dev || 0,
            time_waiting_mean: item.time_waiting_mean || 0,
            time_waiting_median: item.time_waiting_median || 0,
            time_waiting_std_dev: item.time_waiting_std_dev || 0,
            time_blocked_mean: item.time_blocked_mean || 0,
            time_blocked_median: item.time_blocked_median || 0,
            time_blocked_std_dev: item.time_blocked_std_dev || 0,
            time_in_operation_mean: item.time_in_operation_mean || 0,
            time_in_operation_median: item.time_in_operation_median || 0,
            time_in_operation_std_dev: item.time_in_operation_std_dev || 0,
            time_connecting_mean: item.time_connecting_mean || 0,
            time_connecting_median: item.time_connecting_median || 0,
            time_connecting_std_dev: item.time_connecting_std_dev || 0,
            percent_waiting_mean: item.percent_waiting_mean || 0,
            percent_waiting_std_dev: item.percent_waiting_std_dev || 0,
            percent_blocked_mean: item.percent_blocked_mean || 0,
            percent_blocked_std_dev: item.percent_blocked_std_dev || 0,
            percent_operation_mean: item.percent_operation_mean || 0,
            percent_operation_std_dev: item.percent_operation_std_dev || 0,
            percent_connecting_mean: item.percent_connecting_mean || 0,
            percent_connecting_std_dev: item.percent_connecting_std_dev || 0
        };

        conditionalLog(`[entityStateCrossRepSummary] Cleaned item with ID ${item.id}: ${JSON.stringify(cleanedItem, null, 2)}`);

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityStateCrossRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch
    return {
        schema: EntityStateCrossRepSummarySchema,
        patch: {
            items
        }
    };
}
