// services/simulationData/collectors/entityRepCollector.ts
import { EntityRepSummaryData } from '../../../collections/types/interfaces/EntityRepSummaryData';
import { EntityRepSchema } from '../../../collections/entityRepSchema';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityRepSummaryData>([
    'id',
    'scenario_id',
    'scenario_name',
    'entity_id',
    'entity_name',
    'rep',
    'entity_count',
    'completed_count',
    'in_progress_count',
    'throughput_rate',
    'first_exit',
    'last_exit',
    'avg_interval',
    'min_interval',
    'max_interval',
    'avg_time_in_system',
    'avg_time_waiting',
    'avg_time_blocked',
    'avg_time_in_operation',
    'avg_time_connecting',
    'percent_waiting',
    'percent_blocked',
    'percent_operation',
    'percent_connecting'
]);

/**
 * Fetches entity replication summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of entity replication summary data
 */
export async function fetchEntityRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityRepSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[entityRep] Starting fetch operation`);
    conditionalLog(`[entityRep] Container name: ${containerName}`);
    conditionalLog(`[entityRep] Document ID: ${documentId}`);
    conditionalLog(`[entityRep] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/filename.csv
    const baseBlobName = 'entity_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[entityRep] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[entityRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[entityRep] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[entityRep] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[entityRep] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[entityRep] - ${file}`));

                // Check if there's any file that might contain entity rep data
                const entityFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('entity') &&
                    file.toLowerCase().includes('rep') &&
                    file.toLowerCase().includes('summary') &&
                    file.endsWith('.csv')
                );

                if (entityFiles.length > 0) {
                    conditionalLog(`[entityRep] Found potential entity rep summary files with different names:`);
                    entityFiles.forEach(file => conditionalLog(`[entityRep] - ${file}`));
                }
            } else {
                conditionalLog(`[entityRep] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[entityRep] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[entityRep] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[entityRep] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[entityRep] File exists. Fetching data...`);
        let result = await fetchCsvData<EntityRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityRep] Fetched ${result.length} entity rep summary records`);
        if (result.length > 0) {
            conditionalLog(`[entityRep] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: EntityRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                entity_id: String(item.entity_id || "Unknown"),
                entity_name: String(item.entity_name || "Unknown"),
                rep: item.rep ?? 0,
                entity_count: item.entity_count ?? 0,
                completed_count: item.completed_count ?? 0,
                in_progress_count: item.in_progress_count ?? 0,
                throughput_rate: item.throughput_rate ?? 0,
                first_exit: item.first_exit ?? 0,
                last_exit: item.last_exit ?? 0,
                avg_interval: item.avg_interval ?? 0,
                min_interval: item.min_interval ?? 0,
                max_interval: item.max_interval ?? 0,
                avg_time_in_system: item.avg_time_in_system ?? 0,
                avg_time_waiting: item.avg_time_waiting ?? 0,
                avg_time_blocked: item.avg_time_blocked ?? 0,
                avg_time_in_operation: item.avg_time_in_operation ?? 0,
                avg_time_connecting: item.avg_time_connecting ?? 0,
                percent_waiting: item.percent_waiting ?? 0,
                percent_blocked: item.percent_blocked ?? 0,
                percent_operation: item.percent_operation ?? 0,
                percent_connecting: item.percent_connecting ?? 0
            };

            return validItem;
        });

        conditionalLog(`[entityRep] Validated and prepared ${validatedResult.length} entity rep summary records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[entityRep] Error fetching entity rep summary data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares entity replication summary data for Lucid update
 * @param data Array of entity replication summary data
 * @returns Collection update for Lucid
 */
export function prepareEntityRepUpdate(data: EntityRepSummaryData[]) {
    conditionalLog("[entityRep] Starting entity rep summary update preparation");
    conditionalLog(`[entityRep] Processing ${data.length} rows of entity rep summary data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityRep] Processing item with entity_id ${item.entity_id}, rep ${item.rep}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || "Unknown"),
            entity_name: String(item.entity_name || "Unknown"),
            rep: item.rep ?? 0,
            entity_count: item.entity_count ?? 0,
            completed_count: item.completed_count ?? 0,
            in_progress_count: item.in_progress_count ?? 0,
            throughput_rate: item.throughput_rate ?? 0,
            first_exit: item.first_exit ?? 0,
            last_exit: item.last_exit ?? 0,
            avg_interval: item.avg_interval ?? 0,
            min_interval: item.min_interval ?? 0,
            max_interval: item.max_interval ?? 0,
            avg_time_in_system: item.avg_time_in_system ?? 0,
            avg_time_waiting: item.avg_time_waiting ?? 0,
            avg_time_blocked: item.avg_time_blocked ?? 0,
            avg_time_in_operation: item.avg_time_in_operation ?? 0,
            avg_time_connecting: item.avg_time_connecting ?? 0,
            percent_waiting: item.percent_waiting ?? 0,
            percent_blocked: item.percent_blocked ?? 0,
            percent_operation: item.percent_operation ?? 0,
            percent_connecting: item.percent_connecting ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityRep] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: EntityRepSchema,
        patch: {
            items
        }
    };
}
