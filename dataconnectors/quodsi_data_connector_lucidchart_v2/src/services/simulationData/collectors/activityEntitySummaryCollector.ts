// services/simulationData/collectors/activityEntitySummaryCollector.ts
import { ActivityEntitySummaryData } from '../../../collections/types/interfaces/ActivityEntitySummaryData';
import { fetchCsvData, blobExists, listBlobs } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';

// Required columns for validation - matches CSV column names
export const requiredColumns: string[] = [
    'scenario_id',
    'scenario_name',
    'activity_id',
    'activity_name',
    'entity_type',
    // Entity counts
    'entity_count_mean',
    'entity_count_std',
    'entity_count_min',
    'entity_count_max',
    'completed_count_mean',
    'completed_count_std',
    'completed_count_min',
    'completed_count_max',
    // Queue contents
    'inbound_q_avg_contents_mean',
    'inbound_q_avg_contents_std',
    'inbound_q_avg_contents_min',
    'inbound_q_avg_contents_max',
    'activity_avg_contents_mean',
    'activity_avg_contents_std',
    'activity_avg_contents_min',
    'activity_avg_contents_max',
    'outbound_q_avg_contents_mean',
    'outbound_q_avg_contents_std',
    'outbound_q_avg_contents_min',
    'outbound_q_avg_contents_max',
    'total_avg_contents_mean',
    'total_avg_contents_std',
    'total_avg_contents_min',
    'total_avg_contents_max',
    // Time metrics (avg per entity)
    'avg_cycle_time_mean',
    'avg_cycle_time_std',
    'avg_cycle_time_min',
    'avg_cycle_time_max',
    'avg_captured_time_mean',
    'avg_captured_time_std',
    'avg_captured_time_min',
    'avg_captured_time_max',
    'avg_blocked_time_mean',
    'avg_blocked_time_std',
    'avg_blocked_time_min',
    'avg_blocked_time_max',
    'avg_failure_time_mean',
    'avg_failure_time_std',
    'avg_failure_time_min',
    'avg_failure_time_max',
    // Time metrics (total)
    'total_cycle_time_mean',
    'total_cycle_time_std',
    'total_cycle_time_min',
    'total_cycle_time_max',
    'total_captured_time_mean',
    'total_captured_time_std',
    'total_captured_time_min',
    'total_captured_time_max',
    'total_blocked_time_mean',
    'total_blocked_time_std',
    'total_blocked_time_min',
    'total_blocked_time_max',
    'total_failure_time_mean',
    'total_failure_time_std',
    'total_failure_time_min',
    'total_failure_time_max',
    // Cost metrics
    'fixed_cost_mean',
    'fixed_cost_std',
    'fixed_cost_min',
    'fixed_cost_max',
    'processing_cost_mean',
    'processing_cost_std',
    'processing_cost_min',
    'processing_cost_max',
    'operational_cost_mean',
    'operational_cost_std',
    'operational_cost_min',
    'operational_cost_max',
    'total_cost_mean',
    'total_cost_std',
    'total_cost_min',
    'total_cost_max',
    'num_replications'
];

/**
 * Fetches activity entity summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of activity entity summary data
 */
export async function fetchActivityEntitySummary(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityEntitySummaryData[]> {
    conditionalLog(`[activityEntitySummary] Starting fetch operation`);
    conditionalLog(`[activityEntitySummary] Container name: ${containerName}`);
    conditionalLog(`[activityEntitySummary] Document ID: ${documentId}`);
    conditionalLog(`[activityEntitySummary] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    const baseBlobName = 'cross_rep/activity_entity_summary_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[activityEntitySummary] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[activityEntitySummary] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[activityEntitySummary] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[activityEntitySummary] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[activityEntitySummary] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[activityEntitySummary] - ${file}`));

                // Check if there's any file that might contain activity entity summary data
                const activityEntityFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('activity_entity') &&
                    file.endsWith('.csv')
                );

                if (activityEntityFiles.length > 0) {
                    conditionalLog(`[activityEntitySummary] Found potential activity entity summary files with different names:`);
                    activityEntityFiles.forEach(file => conditionalLog(`[activityEntitySummary] - ${file}`));
                }
            } else {
                conditionalLog(`[activityEntitySummary] No files found in scenario folder: ${scenarioId}`);
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[activityEntitySummary] File exists. Fetching data...`);
        const result = await fetchCsvData<ActivityEntitySummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[activityEntitySummary] Fetched ${result.length} activity entity summary records`);
        if (result.length > 0) {
            conditionalLog(`[activityEntitySummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            const validItem: ActivityEntitySummaryData = {
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                activity_id: String(item.activity_id || "Unknown"),
                activity_name: String(item.activity_name || "Unknown"),
                entity_type: String(item.entity_type || "Unknown"),

                // Entity counts
                entity_count_mean: item.entity_count_mean ?? 0,
                entity_count_std: item.entity_count_std ?? 0,
                entity_count_min: item.entity_count_min ?? 0,
                entity_count_max: item.entity_count_max ?? 0,
                completed_count_mean: item.completed_count_mean ?? 0,
                completed_count_std: item.completed_count_std ?? 0,
                completed_count_min: item.completed_count_min ?? 0,
                completed_count_max: item.completed_count_max ?? 0,

                // Queue contents
                inbound_q_avg_contents_mean: item.inbound_q_avg_contents_mean ?? 0,
                inbound_q_avg_contents_std: item.inbound_q_avg_contents_std ?? 0,
                inbound_q_avg_contents_min: item.inbound_q_avg_contents_min ?? 0,
                inbound_q_avg_contents_max: item.inbound_q_avg_contents_max ?? 0,
                activity_avg_contents_mean: item.activity_avg_contents_mean ?? 0,
                activity_avg_contents_std: item.activity_avg_contents_std ?? 0,
                activity_avg_contents_min: item.activity_avg_contents_min ?? 0,
                activity_avg_contents_max: item.activity_avg_contents_max ?? 0,
                outbound_q_avg_contents_mean: item.outbound_q_avg_contents_mean ?? 0,
                outbound_q_avg_contents_std: item.outbound_q_avg_contents_std ?? 0,
                outbound_q_avg_contents_min: item.outbound_q_avg_contents_min ?? 0,
                outbound_q_avg_contents_max: item.outbound_q_avg_contents_max ?? 0,
                total_avg_contents_mean: item.total_avg_contents_mean ?? 0,
                total_avg_contents_std: item.total_avg_contents_std ?? 0,
                total_avg_contents_min: item.total_avg_contents_min ?? 0,
                total_avg_contents_max: item.total_avg_contents_max ?? 0,

                // Time metrics (avg per entity)
                avg_cycle_time_mean: item.avg_cycle_time_mean ?? 0,
                avg_cycle_time_std: item.avg_cycle_time_std ?? 0,
                avg_cycle_time_min: item.avg_cycle_time_min ?? 0,
                avg_cycle_time_max: item.avg_cycle_time_max ?? 0,
                avg_captured_time_mean: item.avg_captured_time_mean ?? 0,
                avg_captured_time_std: item.avg_captured_time_std ?? 0,
                avg_captured_time_min: item.avg_captured_time_min ?? 0,
                avg_captured_time_max: item.avg_captured_time_max ?? 0,
                avg_blocked_time_mean: item.avg_blocked_time_mean ?? 0,
                avg_blocked_time_std: item.avg_blocked_time_std ?? 0,
                avg_blocked_time_min: item.avg_blocked_time_min ?? 0,
                avg_blocked_time_max: item.avg_blocked_time_max ?? 0,
                avg_failure_time_mean: item.avg_failure_time_mean ?? 0,
                avg_failure_time_std: item.avg_failure_time_std ?? 0,
                avg_failure_time_min: item.avg_failure_time_min ?? 0,
                avg_failure_time_max: item.avg_failure_time_max ?? 0,

                // Time metrics (total)
                total_cycle_time_mean: item.total_cycle_time_mean ?? 0,
                total_cycle_time_std: item.total_cycle_time_std ?? 0,
                total_cycle_time_min: item.total_cycle_time_min ?? 0,
                total_cycle_time_max: item.total_cycle_time_max ?? 0,
                total_captured_time_mean: item.total_captured_time_mean ?? 0,
                total_captured_time_std: item.total_captured_time_std ?? 0,
                total_captured_time_min: item.total_captured_time_min ?? 0,
                total_captured_time_max: item.total_captured_time_max ?? 0,
                total_blocked_time_mean: item.total_blocked_time_mean ?? 0,
                total_blocked_time_std: item.total_blocked_time_std ?? 0,
                total_blocked_time_min: item.total_blocked_time_min ?? 0,
                total_blocked_time_max: item.total_blocked_time_max ?? 0,
                total_failure_time_mean: item.total_failure_time_mean ?? 0,
                total_failure_time_std: item.total_failure_time_std ?? 0,
                total_failure_time_min: item.total_failure_time_min ?? 0,
                total_failure_time_max: item.total_failure_time_max ?? 0,

                // Cost metrics
                fixed_cost_mean: item.fixed_cost_mean ?? 0,
                fixed_cost_std: item.fixed_cost_std ?? 0,
                fixed_cost_min: item.fixed_cost_min ?? 0,
                fixed_cost_max: item.fixed_cost_max ?? 0,
                processing_cost_mean: item.processing_cost_mean ?? 0,
                processing_cost_std: item.processing_cost_std ?? 0,
                processing_cost_min: item.processing_cost_min ?? 0,
                processing_cost_max: item.processing_cost_max ?? 0,
                operational_cost_mean: item.operational_cost_mean ?? 0,
                operational_cost_std: item.operational_cost_std ?? 0,
                operational_cost_min: item.operational_cost_min ?? 0,
                operational_cost_max: item.operational_cost_max ?? 0,
                total_cost_mean: item.total_cost_mean ?? 0,
                total_cost_std: item.total_cost_std ?? 0,
                total_cost_min: item.total_cost_min ?? 0,
                total_cost_max: item.total_cost_max ?? 0,

                num_replications: item.num_replications ?? 0
            };

            return validItem;
        });

        conditionalLog(`[activityEntitySummary] Validated and prepared ${validatedResult.length} activity entity summary records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityEntitySummary] Error fetching activity entity summary data: ${error.message}`);
        throw error;
    }
}
