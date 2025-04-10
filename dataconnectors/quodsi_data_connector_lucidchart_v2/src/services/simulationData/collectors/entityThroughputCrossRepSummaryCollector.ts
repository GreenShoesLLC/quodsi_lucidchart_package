// services/simulationData/collectors/entityThroughputCrossRepSummary.ts
import { EntityThroughputCrossRepSummaryData } from '../../../collections/types/interfaces/EntityThroughputCrossRepSummaryData';
import { EntityThroughputCrossRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType, blobExists } from '../csvParser';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityThroughputCrossRepSummaryData>([
    'id',
    'scenario_id',
    'scenario_name',
    'entity_id',
    'entity_name',
    'count_mean',
    'count_median',
    'count_std_dev',
    'completed_count_mean',
    'completed_count_median',
    'completed_count_std_dev',
    'in_progress_count_mean',
    'in_progress_count_median',
    'in_progress_count_std_dev',
    'throughput_rate_mean',
    'throughput_rate_median',
    'throughput_rate_std_dev',
    'throughput_rate_cv',
    'interval_mean',
    'interval_median',
    'interval_std_dev',
    'interval_cv',
    'first_exit_mean',
    'first_exit_median',
    'first_exit_std_dev',
    'last_exit_mean',
    'last_exit_median',
    'last_exit_std_dev'
]);

/**
 * Fetches entity throughput cross rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID to use as folder prefix
 * @returns Array of entity throughput cross rep summary data
 */
export async function fetchEntityThroughputCrossRepSummary(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityThroughputCrossRepSummaryData[]> {
    const baseBlobName = 'entity_throughput_cross_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;

    conditionalLog(`[entityThroughputCrossRepSummary] Attempting to fetch data from: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists at the primary location
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[entityThroughputCrossRepSummary] File does not exist at primary location: ${containerName}/${blobName}`);

            // Try in the results folder
            const altBlobName = `${scenarioId}/results/${baseBlobName}`;
            const altExists = await blobExists(containerName, altBlobName);

            if (altExists) {
                conditionalLog(`[entityThroughputCrossRepSummary] Found file in results folder: ${containerName}/${altBlobName}`);
                const result = await fetchCsvData<EntityThroughputCrossRepSummaryData>(
                    containerName,
                    altBlobName,
                    documentId,
                    requiredColumns
                );

                conditionalLog(`[entityThroughputCrossRepSummary] Fetched ${result.length} records from results folder`);
                return validateData(result);
            }

            conditionalWarn(`[entityThroughputCrossRepSummary] Could not find entity throughput cross rep summary data in any location`);
            return [];
        }

        // Fetch the data from the primary location
        const result = await fetchCsvData<EntityThroughputCrossRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityThroughputCrossRepSummary] Fetched ${result.length} entity throughput cross rep summary records`);
        if (result.length > 0) {
            conditionalLog(`[entityThroughputCrossRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        return validateData(result);
    } catch (error) {
        conditionalError(`[entityThroughputCrossRepSummary] Error fetching entity throughput cross rep summary data: ${error.message}`);
        throw error;
    }
}

/**
 * Validates and provides defaults for entity throughput cross rep summary data
 * @param data Raw data from CSV
 * @returns Validated data with defaults for missing fields
 */
function validateData(data: EntityThroughputCrossRepSummaryData[]): EntityThroughputCrossRepSummaryData[] {
    return data.map(item => {
        // Create a new object with defaults for all required fields
        const validItem: EntityThroughputCrossRepSummaryData = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || 'Unknown'),
            entity_name: String(item.entity_name || 'Unknown'),
            count_mean: item.count_mean || 0,
            count_median: item.count_median || 0,
            count_std_dev: item.count_std_dev || 0,
            completed_count_mean: item.completed_count_mean || 0,
            completed_count_median: item.completed_count_median || 0,
            completed_count_std_dev: item.completed_count_std_dev || 0,
            in_progress_count_mean: item.in_progress_count_mean || 0,
            in_progress_count_median: item.in_progress_count_median || 0,
            in_progress_count_std_dev: item.in_progress_count_std_dev || 0,
            throughput_rate_mean: item.throughput_rate_mean || 0,
            throughput_rate_median: item.throughput_rate_median || 0,
            throughput_rate_std_dev: item.throughput_rate_std_dev || 0,
            throughput_rate_cv: (item.throughput_rate_cv || 0),
            interval_mean: item.interval_mean || 0,
            interval_median: item.interval_median || 0,
            interval_std_dev: item.interval_std_dev || 0,
            interval_cv: item.interval_cv || 0,
            first_exit_mean: (item.first_exit_mean || 0),
            first_exit_median: (item.first_exit_median || 0),
            first_exit_std_dev: (item.first_exit_std_dev || 0),
            last_exit_mean: (item.last_exit_mean || 0),
            last_exit_median: (item.last_exit_median || 0),
            last_exit_std_dev: (item.last_exit_std_dev || 0)
        };

        return validItem;
    });
}

/**
 * Prepares entity throughput cross rep summary data for Lucid update
 * @param data Array of entity throughput cross rep summary data
 * @returns Collection update for Lucid
 */
export function prepareEntityThroughputCrossRepSummaryUpdate(data: EntityThroughputCrossRepSummaryData[]) {
    conditionalLog("[entityThroughputCrossRepSummary] Starting entity throughput cross rep summary update preparation");
    conditionalLog(`[entityThroughputCrossRepSummary] Processing ${data.length} rows of entity throughput cross rep summary data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityThroughputCrossRepSummary] Processing item: ${JSON.stringify(item, null, 2)}`);

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
            completed_count_mean: item.completed_count_mean || 0,
            completed_count_median: item.completed_count_median || 0,
            completed_count_std_dev: item.completed_count_std_dev || 0,
            in_progress_count_mean: item.in_progress_count_mean || 0,
            in_progress_count_median: item.in_progress_count_median || 0,
            in_progress_count_std_dev: item.in_progress_count_std_dev || 0,
            throughput_rate_mean: item.throughput_rate_mean || 0,
            throughput_rate_median: item.throughput_rate_median || 0,
            throughput_rate_std_dev: item.throughput_rate_std_dev || 0,
            throughput_rate_cv: (item.throughput_rate_cv || ''),
            interval_mean: item.interval_mean || 0,
            interval_median: item.interval_median || 0,
            interval_std_dev: item.interval_std_dev || 0,
            interval_cv: (item.interval_cv || 0),
            first_exit_mean: (item.first_exit_mean || 0),
            first_exit_median: (item.first_exit_median || 0),
            first_exit_std_dev: (item.first_exit_std_dev || 0),
            last_exit_mean: (item.last_exit_mean || 0),
            last_exit_median: (item.last_exit_median || 0),
            last_exit_std_dev: (item.last_exit_std_dev || 0)
        };

        conditionalLog(`[entityThroughputCrossRepSummary] Cleaned item with ID ${item.id}: ${JSON.stringify(cleanedItem, null, 2)}`);

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityThroughputCrossRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch
    return {
        schema: EntityThroughputCrossRepSummarySchema,
        patch: {
            items
        }
    };
}
