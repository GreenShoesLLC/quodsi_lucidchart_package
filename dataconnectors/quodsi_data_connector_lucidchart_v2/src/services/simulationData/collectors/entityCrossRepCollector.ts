// services/simulationData/collectors/entityCrossRepCollector.ts
import { EntityCrossRepSummaryData } from '../../../collections/types/interfaces/EntityCrossRepSummaryData';
import { EntityCrossRepSchema } from '../../../collections/entityCrossRepSchema';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityCrossRepSummaryData>([
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
    'overall_interval_mean',
    'overall_interval_median',
    'overall_interval_std_dev',
    'overall_interval_cv',
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
 * Fetches entity cross-replication summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of entity cross-replication summary data
 */
export async function fetchEntityCrossRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityCrossRepSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[entityCrossRep] Starting fetch operation`);
    conditionalLog(`[entityCrossRep] Container name: ${containerName}`);
    conditionalLog(`[entityCrossRep] Document ID: ${documentId}`);
    conditionalLog(`[entityCrossRep] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/filename.csv
    const baseBlobName = 'entity_cross_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[entityCrossRep] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[entityCrossRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[entityCrossRep] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[entityCrossRep] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[entityCrossRep] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[entityCrossRep] - ${file}`));

                // Check if there's any file that might contain entity cross-rep data
                const entityFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('entity') &&
                    file.toLowerCase().includes('cross') &&
                    file.endsWith('.csv')
                );

                if (entityFiles.length > 0) {
                    conditionalLog(`[entityCrossRep] Found potential entity cross-rep files with different names:`);
                    entityFiles.forEach(file => conditionalLog(`[entityCrossRep] - ${file}`));
                }
            } else {
                conditionalLog(`[entityCrossRep] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[entityCrossRep] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[entityCrossRep] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[entityCrossRep] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[entityCrossRep] File exists. Fetching data...`);
        let result = await fetchCsvData<EntityCrossRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityCrossRep] Fetched ${result.length} entity cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[entityCrossRep] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: EntityCrossRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                entity_id: String(item.entity_id || "Unknown"),
                entity_name: String(item.entity_name || "Unknown"),
                
                // Count statistics
                count_mean: item.count_mean ?? 0,
                count_median: item.count_median ?? 0,
                count_std_dev: item.count_std_dev ?? 0,
                
                // Completed count statistics
                completed_count_mean: item.completed_count_mean ?? 0,
                completed_count_median: item.completed_count_median ?? 0,
                completed_count_std_dev: item.completed_count_std_dev ?? 0,
                
                // In progress count statistics
                in_progress_count_mean: item.in_progress_count_mean ?? 0,
                in_progress_count_median: item.in_progress_count_median ?? 0,
                in_progress_count_std_dev: item.in_progress_count_std_dev ?? 0,
                
                // Throughput rate statistics
                throughput_rate_mean: item.throughput_rate_mean ?? 0,
                throughput_rate_median: item.throughput_rate_median ?? 0,
                throughput_rate_std_dev: item.throughput_rate_std_dev ?? 0,
                throughput_rate_cv: item.throughput_rate_cv ?? 0,
                
                // Interval statistics
                interval_mean: item.interval_mean ?? 0,
                interval_median: item.interval_median ?? 0,
                interval_std_dev: item.interval_std_dev ?? 0,
                interval_cv: item.interval_cv ?? 0,
                
                // Overall interval statistics
                overall_interval_mean: item.overall_interval_mean ?? 0,
                overall_interval_median: item.overall_interval_median ?? 0,
                overall_interval_std_dev: item.overall_interval_std_dev ?? 0,
                overall_interval_cv: item.overall_interval_cv ?? 0,
                
                // First exit statistics
                first_exit_mean: item.first_exit_mean ?? 0,
                first_exit_median: item.first_exit_median ?? 0,
                first_exit_std_dev: item.first_exit_std_dev ?? 0,
                
                // Last exit statistics
                last_exit_mean: item.last_exit_mean ?? 0,
                last_exit_median: item.last_exit_median ?? 0,
                last_exit_std_dev: item.last_exit_std_dev ?? 0,
                
                // Time metrics
                time_in_system_mean: item.time_in_system_mean ?? 0,
                time_in_system_median: item.time_in_system_median ?? 0,
                time_in_system_std_dev: item.time_in_system_std_dev ?? 0,
                time_waiting_mean: item.time_waiting_mean ?? 0,
                time_waiting_median: item.time_waiting_median ?? 0,
                time_waiting_std_dev: item.time_waiting_std_dev ?? 0,
                time_blocked_mean: item.time_blocked_mean ?? 0,
                time_blocked_median: item.time_blocked_median ?? 0,
                time_blocked_std_dev: item.time_blocked_std_dev ?? 0,
                time_in_operation_mean: item.time_in_operation_mean ?? 0,
                time_in_operation_median: item.time_in_operation_median ?? 0,
                time_in_operation_std_dev: item.time_in_operation_std_dev ?? 0,
                time_connecting_mean: item.time_connecting_mean ?? 0,
                time_connecting_median: item.time_connecting_median ?? 0,
                time_connecting_std_dev: item.time_connecting_std_dev ?? 0,
                
                // Percentage metrics
                percent_waiting_mean: item.percent_waiting_mean ?? 0,
                percent_waiting_std_dev: item.percent_waiting_std_dev ?? 0,
                percent_blocked_mean: item.percent_blocked_mean ?? 0,
                percent_blocked_std_dev: item.percent_blocked_std_dev ?? 0,
                percent_operation_mean: item.percent_operation_mean ?? 0,
                percent_operation_std_dev: item.percent_operation_std_dev ?? 0,
                percent_connecting_mean: item.percent_connecting_mean ?? 0,
                percent_connecting_std_dev: item.percent_connecting_std_dev ?? 0
            };

            return validItem;
        });

        conditionalLog(`[entityCrossRep] Validated and prepared ${validatedResult.length} entity cross-rep records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[entityCrossRep] Error fetching entity cross-rep data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares entity cross-replication summary data for Lucid update
 * @param data Array of entity cross-replication summary data
 * @returns Collection update for Lucid
 */
export function prepareEntityCrossRepUpdate(data: EntityCrossRepSummaryData[]) {
    conditionalLog("[entityCrossRep] Starting entity cross-rep update preparation");
    conditionalLog(`[entityCrossRep] Processing ${data.length} rows of entity cross-rep data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityCrossRep] Processing item with entity_id ${item.entity_id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || "Unknown"),
            entity_name: String(item.entity_name || "Unknown"),
            
            // Count statistics
            count_mean: item.count_mean ?? 0,
            count_median: item.count_median ?? 0,
            count_std_dev: item.count_std_dev ?? 0,
            
            // Completed count statistics
            completed_count_mean: item.completed_count_mean ?? 0,
            completed_count_median: item.completed_count_median ?? 0,
            completed_count_std_dev: item.completed_count_std_dev ?? 0,
            
            // In progress count statistics
            in_progress_count_mean: item.in_progress_count_mean ?? 0,
            in_progress_count_median: item.in_progress_count_median ?? 0,
            in_progress_count_std_dev: item.in_progress_count_std_dev ?? 0,
            
            // Throughput rate statistics
            throughput_rate_mean: item.throughput_rate_mean ?? 0,
            throughput_rate_median: item.throughput_rate_median ?? 0,
            throughput_rate_std_dev: item.throughput_rate_std_dev ?? 0,
            throughput_rate_cv: item.throughput_rate_cv ?? 0,
            
            // Interval statistics
            interval_mean: item.interval_mean ?? 0,
            interval_median: item.interval_median ?? 0,
            interval_std_dev: item.interval_std_dev ?? 0,
            interval_cv: item.interval_cv ?? 0,
            
            // Overall interval statistics
            overall_interval_mean: item.overall_interval_mean ?? 0,
            overall_interval_median: item.overall_interval_median ?? 0,
            overall_interval_std_dev: item.overall_interval_std_dev ?? 0,
            overall_interval_cv: item.overall_interval_cv ?? 0,
            
            // First exit statistics
            first_exit_mean: item.first_exit_mean ?? 0,
            first_exit_median: item.first_exit_median ?? 0,
            first_exit_std_dev: item.first_exit_std_dev ?? 0,
            
            // Last exit statistics
            last_exit_mean: item.last_exit_mean ?? 0,
            last_exit_median: item.last_exit_median ?? 0,
            last_exit_std_dev: item.last_exit_std_dev ?? 0,
            
            // Time metrics
            time_in_system_mean: item.time_in_system_mean ?? 0,
            time_in_system_median: item.time_in_system_median ?? 0,
            time_in_system_std_dev: item.time_in_system_std_dev ?? 0,
            time_waiting_mean: item.time_waiting_mean ?? 0,
            time_waiting_median: item.time_waiting_median ?? 0,
            time_waiting_std_dev: item.time_waiting_std_dev ?? 0,
            time_blocked_mean: item.time_blocked_mean ?? 0,
            time_blocked_median: item.time_blocked_median ?? 0,
            time_blocked_std_dev: item.time_blocked_std_dev ?? 0,
            time_in_operation_mean: item.time_in_operation_mean ?? 0,
            time_in_operation_median: item.time_in_operation_median ?? 0,
            time_in_operation_std_dev: item.time_in_operation_std_dev ?? 0,
            time_connecting_mean: item.time_connecting_mean ?? 0,
            time_connecting_median: item.time_connecting_median ?? 0,
            time_connecting_std_dev: item.time_connecting_std_dev ?? 0,
            
            // Percentage metrics
            percent_waiting_mean: item.percent_waiting_mean ?? 0,
            percent_waiting_std_dev: item.percent_waiting_std_dev ?? 0,
            percent_blocked_mean: item.percent_blocked_mean ?? 0,
            percent_blocked_std_dev: item.percent_blocked_std_dev ?? 0,
            percent_operation_mean: item.percent_operation_mean ?? 0,
            percent_operation_std_dev: item.percent_operation_std_dev ?? 0,
            percent_connecting_mean: item.percent_connecting_mean ?? 0,
            percent_connecting_std_dev: item.percent_connecting_std_dev ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityCrossRep] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: EntityCrossRepSchema,
        patch: {
            items
        }
    };
}
