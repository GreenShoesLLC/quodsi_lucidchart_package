// services/simulationData/collectors/stateSummaryCollector.ts
import { StateSummaryData } from '../../../collections/types/interfaces/StateSummaryData';
import { fetchCsvData, blobExists, listBlobs } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';

// Required columns for validation
// Note: These match the CSV headers exactly, no field name mapping needed
export const requiredColumns: string[] = [
    'scenario_id',
    'scenario_name',
    'state_key',
    'component_type',
    'component_name',
    'state_name',
    'state_type',
    'num_replications',
    'mean_change_count',
    'change_count_ci_lower',
    'change_count_ci_upper',
    'mean_final_value',
    'final_value_ci_lower',
    'final_value_ci_upper',
    'final_value_std_dev',
    'mean_time_weighted_avg',
    'time_weighted_avg_ci_lower',
    'time_weighted_avg_ci_upper',
    'mean_min_value',
    'overall_min_value',
    'mean_max_value',
    'overall_max_value',
    'most_common_category',
    'mean_percent_time_true',
    'percent_time_true_ci_lower',
    'percent_time_true_ci_upper'
];

/**
 * Fetches state summary cross-replication data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of state summary data
 */
export async function fetchStateSummary(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<StateSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[stateSummary] Starting fetch operation`);
    conditionalLog(`[stateSummary] Container name: ${containerName}`);
    conditionalLog(`[stateSummary] Document ID: ${documentId}`);
    conditionalLog(`[stateSummary] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    const baseBlobName = 'cross_rep/state_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[stateSummary] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[stateSummary] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[stateSummary] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[stateSummary] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[stateSummary] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[stateSummary] - ${file}`));

                // Check if there's any file that might contain state summary data
                const stateFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('state') &&
                    file.toLowerCase().includes('summary') &&
                    file.endsWith('.csv')
                );

                if (stateFiles.length > 0) {
                    conditionalLog(`[stateSummary] Found potential state summary files with different names:`);
                    stateFiles.forEach(file => conditionalLog(`[stateSummary] - ${file}`));
                }
            } else {
                conditionalLog(`[stateSummary] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[stateSummary] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[stateSummary] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[stateSummary] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[stateSummary] File exists. Fetching data...`);
        const result = await fetchCsvData<StateSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[stateSummary] Fetched ${result.length} state summary records`);
        if (result.length > 0) {
            conditionalLog(`[stateSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Note: No field mapping needed since CSV column names match interface exactly
        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            const validItem: StateSummaryData = {
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                state_key: String(item.state_key || "Unknown"),
                component_type: String(item.component_type || "Unknown"),
                component_name: String(item.component_name || "Unknown"),
                state_name: String(item.state_name || "Unknown"),
                state_type: String(item.state_type || "NUMBER"),
                num_replications: item.num_replications ?? 0,
                mean_change_count: item.mean_change_count ?? 0,
                change_count_ci_lower: item.change_count_ci_lower ?? 0,
                change_count_ci_upper: item.change_count_ci_upper ?? 0,
                mean_final_value: item.mean_final_value ?? 0,
                final_value_ci_lower: item.final_value_ci_lower ?? 0,
                final_value_ci_upper: item.final_value_ci_upper ?? 0,
                final_value_std_dev: item.final_value_std_dev ?? 0,
                mean_time_weighted_avg: item.mean_time_weighted_avg ?? 0,
                time_weighted_avg_ci_lower: item.time_weighted_avg_ci_lower ?? 0,
                time_weighted_avg_ci_upper: item.time_weighted_avg_ci_upper ?? 0,
                mean_min_value: item.mean_min_value ?? 0,
                overall_min_value: item.overall_min_value ?? 0,
                mean_max_value: item.mean_max_value ?? 0,
                overall_max_value: item.overall_max_value ?? 0,
                most_common_category: String(item.most_common_category || ""),
                mean_percent_time_true: item.mean_percent_time_true ?? 0,
                percent_time_true_ci_lower: item.percent_time_true_ci_lower ?? 0,
                percent_time_true_ci_upper: item.percent_time_true_ci_upper ?? 0
            };

            return validItem;
        });

        conditionalLog(`[stateSummary] Validated and prepared ${validatedResult.length} state summary records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[stateSummary] Error fetching state summary data: ${error.message}`);
        throw error;
    }
}
