// services/simulationData/collectors/scenarioCrossRepCollector.ts
import { ScenarioCrossRepSummaryData } from '../../../collections/types/interfaces/ScenarioCrossRepSummaryData';
import { ScenarioCrossRepSchema } from '../../../collections/scenarioCrossRepSchema';
import { fetchCsvData, blobExists, listBlobs } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
// Note: CSV uses _std suffix, not _std_dev. We'll map them after parsing.
export const requiredColumns: string[] = [
    'scenario_id',
    'scenario_name',
    'total_throughput_mean',
    'total_throughput_std',
    'total_throughput_min',
    'total_throughput_max',
    'total_entities_created_mean',
    'total_entities_created_std',
    'total_entities_created_min',
    'total_entities_created_max',
    'entities_in_progress_mean',
    'entities_in_progress_std',
    'entities_in_progress_min',
    'entities_in_progress_max',
    'avg_cycle_time_mean',
    'avg_cycle_time_std',
    'avg_cycle_time_min',
    'avg_cycle_time_max',
    'avg_time_in_system_mean',
    'avg_time_in_system_std',
    'avg_time_in_system_min',
    'avg_time_in_system_max',
    'avg_entities_in_system_mean',
    'avg_entities_in_system_std',
    'avg_entities_in_system_min',
    'avg_entities_in_system_max',
    'total_activity_cost_mean',
    'total_activity_cost_std',
    'total_activity_cost_min',
    'total_activity_cost_max',
    'total_resource_cost_mean',
    'total_resource_cost_std',
    'total_resource_cost_min',
    'total_resource_cost_max',
    'total_cost_mean',
    'total_cost_std',
    'total_cost_min',
    'total_cost_max',
    'num_replications'
];

/**
 * Fetches scenario cross-replication summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of scenario cross-replication summary data
 */
export async function fetchScenarioCrossRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ScenarioCrossRepSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[scenarioCrossRep] Starting fetch operation`);
    conditionalLog(`[scenarioCrossRep] Container name: ${containerName}`);
    conditionalLog(`[scenarioCrossRep] Document ID: ${documentId}`);
    conditionalLog(`[scenarioCrossRep] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    const baseBlobName = 'cross_rep/scenario_summary_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[scenarioCrossRep] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[scenarioCrossRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[scenarioCrossRep] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[scenarioCrossRep] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[scenarioCrossRep] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[scenarioCrossRep] - ${file}`));

                // Check if there's any file that might contain scenario cross-rep data
                const scenarioFiles2 = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('scenario') &&
                    file.toLowerCase().includes('summary') &&
                    file.endsWith('.csv')
                );

                if (scenarioFiles2.length > 0) {
                    conditionalLog(`[scenarioCrossRep] Found potential scenario cross-rep files with different names:`);
                    scenarioFiles2.forEach(file => conditionalLog(`[scenarioCrossRep] - ${file}`));
                }
            } else {
                conditionalLog(`[scenarioCrossRep] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[scenarioCrossRep] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[scenarioCrossRep] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[scenarioCrossRep] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[scenarioCrossRep] File exists. Fetching data...`);
        let result = await fetchCsvData<any>(  // Use 'any' since CSV has different column names
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[scenarioCrossRep] Fetched ${result.length} scenario cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[scenarioCrossRep] First record sample (before mapping): ${JSON.stringify(result[0])}`);
        }

        // Map CSV column names to schema field names
        // CSV uses _std suffix, schema expects _std_dev
        const mappedResult: ScenarioCrossRepSummaryData[] = result.map((item: any) => ({
            // Use scenario_id as the unique ID since there's one row per scenario
            id: item.scenario_id,
            scenario_id: item.scenario_id,
            scenario_name: item.scenario_name,

            // Map all _std fields to _std_dev
            total_throughput_mean: item.total_throughput_mean,
            total_throughput_std_dev: item.total_throughput_std,
            total_throughput_min: item.total_throughput_min,
            total_throughput_max: item.total_throughput_max,

            total_entities_created_mean: item.total_entities_created_mean,
            total_entities_created_std_dev: item.total_entities_created_std,
            total_entities_created_min: item.total_entities_created_min,
            total_entities_created_max: item.total_entities_created_max,

            entities_in_progress_mean: item.entities_in_progress_mean,
            entities_in_progress_std_dev: item.entities_in_progress_std,
            entities_in_progress_min: item.entities_in_progress_min,
            entities_in_progress_max: item.entities_in_progress_max,

            avg_cycle_time_mean: item.avg_cycle_time_mean,
            avg_cycle_time_std_dev: item.avg_cycle_time_std,
            avg_cycle_time_min: item.avg_cycle_time_min,
            avg_cycle_time_max: item.avg_cycle_time_max,

            avg_time_in_system_mean: item.avg_time_in_system_mean,
            avg_time_in_system_std_dev: item.avg_time_in_system_std,
            avg_time_in_system_min: item.avg_time_in_system_min,
            avg_time_in_system_max: item.avg_time_in_system_max,

            avg_entities_in_system_mean: item.avg_entities_in_system_mean,
            avg_entities_in_system_std_dev: item.avg_entities_in_system_std,
            avg_entities_in_system_min: item.avg_entities_in_system_min,
            avg_entities_in_system_max: item.avg_entities_in_system_max,

            total_activity_cost_mean: item.total_activity_cost_mean,
            total_activity_cost_std_dev: item.total_activity_cost_std,
            total_activity_cost_min: item.total_activity_cost_min,
            total_activity_cost_max: item.total_activity_cost_max,

            total_resource_cost_mean: item.total_resource_cost_mean,
            total_resource_cost_std_dev: item.total_resource_cost_std,
            total_resource_cost_min: item.total_resource_cost_min,
            total_resource_cost_max: item.total_resource_cost_max,

            total_cost_mean: item.total_cost_mean,
            total_cost_std_dev: item.total_cost_std,
            total_cost_min: item.total_cost_min,
            total_cost_max: item.total_cost_max,

            num_replications: item.num_replications
        }));

        conditionalLog(`[scenarioCrossRep] Mapped ${mappedResult.length} records with schema-compliant field names`);
        if (mappedResult.length > 0) {
            conditionalLog(`[scenarioCrossRep] First mapped record sample: ${JSON.stringify(mappedResult[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = mappedResult.map(item => {
            const validItem: ScenarioCrossRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),

                // Total Throughput metrics
                total_throughput_mean: item.total_throughput_mean ?? 0,
                total_throughput_std_dev: item.total_throughput_std_dev ?? 0,
                total_throughput_min: item.total_throughput_min ?? 0,
                total_throughput_max: item.total_throughput_max ?? 0,

                // Total Entities Created metrics
                total_entities_created_mean: item.total_entities_created_mean ?? 0,
                total_entities_created_std_dev: item.total_entities_created_std_dev ?? 0,
                total_entities_created_min: item.total_entities_created_min ?? 0,
                total_entities_created_max: item.total_entities_created_max ?? 0,

                // Entities In Progress metrics
                entities_in_progress_mean: item.entities_in_progress_mean ?? 0,
                entities_in_progress_std_dev: item.entities_in_progress_std_dev ?? 0,
                entities_in_progress_min: item.entities_in_progress_min ?? 0,
                entities_in_progress_max: item.entities_in_progress_max ?? 0,

                // Avg Cycle Time metrics
                avg_cycle_time_mean: item.avg_cycle_time_mean ?? 0,
                avg_cycle_time_std_dev: item.avg_cycle_time_std_dev ?? 0,
                avg_cycle_time_min: item.avg_cycle_time_min ?? 0,
                avg_cycle_time_max: item.avg_cycle_time_max ?? 0,

                // Avg Time In System metrics
                avg_time_in_system_mean: item.avg_time_in_system_mean ?? 0,
                avg_time_in_system_std_dev: item.avg_time_in_system_std_dev ?? 0,
                avg_time_in_system_min: item.avg_time_in_system_min ?? 0,
                avg_time_in_system_max: item.avg_time_in_system_max ?? 0,

                // Avg Entities In System metrics
                avg_entities_in_system_mean: item.avg_entities_in_system_mean ?? 0,
                avg_entities_in_system_std_dev: item.avg_entities_in_system_std_dev ?? 0,
                avg_entities_in_system_min: item.avg_entities_in_system_min ?? 0,
                avg_entities_in_system_max: item.avg_entities_in_system_max ?? 0,

                // Total Activity Cost metrics
                total_activity_cost_mean: item.total_activity_cost_mean ?? 0,
                total_activity_cost_std_dev: item.total_activity_cost_std_dev ?? 0,
                total_activity_cost_min: item.total_activity_cost_min ?? 0,
                total_activity_cost_max: item.total_activity_cost_max ?? 0,

                // Total Resource Cost metrics
                total_resource_cost_mean: item.total_resource_cost_mean ?? 0,
                total_resource_cost_std_dev: item.total_resource_cost_std_dev ?? 0,
                total_resource_cost_min: item.total_resource_cost_min ?? 0,
                total_resource_cost_max: item.total_resource_cost_max ?? 0,

                // Total Cost metrics
                total_cost_mean: item.total_cost_mean ?? 0,
                total_cost_std_dev: item.total_cost_std_dev ?? 0,
                total_cost_min: item.total_cost_min ?? 0,
                total_cost_max: item.total_cost_max ?? 0,

                // Replication count
                num_replications: item.num_replications ?? 0
            };

            return validItem;
        });

        conditionalLog(`[scenarioCrossRep] Validated and prepared ${validatedResult.length} scenario cross-rep records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[scenarioCrossRep] Error fetching scenario cross-rep data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares scenario cross-replication summary data for Lucid update
 * @param data Array of scenario cross-replication summary data
 * @returns Collection update for Lucid
 */
export function prepareScenarioCrossRepUpdate(data: ScenarioCrossRepSummaryData[]) {
    conditionalLog("[scenarioCrossRep] Starting scenario cross-rep update preparation");
    conditionalLog(`[scenarioCrossRep] Processing ${data.length} rows of scenario cross-rep data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[scenarioCrossRep] Processing item with scenario_id ${item.scenario_id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),

            // Total Throughput metrics
            total_throughput_mean: item.total_throughput_mean ?? 0,
            total_throughput_std_dev: item.total_throughput_std_dev ?? 0,
            total_throughput_min: item.total_throughput_min ?? 0,
            total_throughput_max: item.total_throughput_max ?? 0,

            // Total Entities Created metrics
            total_entities_created_mean: item.total_entities_created_mean ?? 0,
            total_entities_created_std_dev: item.total_entities_created_std_dev ?? 0,
            total_entities_created_min: item.total_entities_created_min ?? 0,
            total_entities_created_max: item.total_entities_created_max ?? 0,

            // Entities In Progress metrics
            entities_in_progress_mean: item.entities_in_progress_mean ?? 0,
            entities_in_progress_std_dev: item.entities_in_progress_std_dev ?? 0,
            entities_in_progress_min: item.entities_in_progress_min ?? 0,
            entities_in_progress_max: item.entities_in_progress_max ?? 0,

            // Avg Cycle Time metrics
            avg_cycle_time_mean: item.avg_cycle_time_mean ?? 0,
            avg_cycle_time_std_dev: item.avg_cycle_time_std_dev ?? 0,
            avg_cycle_time_min: item.avg_cycle_time_min ?? 0,
            avg_cycle_time_max: item.avg_cycle_time_max ?? 0,

            // Avg Time In System metrics
            avg_time_in_system_mean: item.avg_time_in_system_mean ?? 0,
            avg_time_in_system_std_dev: item.avg_time_in_system_std_dev ?? 0,
            avg_time_in_system_min: item.avg_time_in_system_min ?? 0,
            avg_time_in_system_max: item.avg_time_in_system_max ?? 0,

            // Avg Entities In System metrics
            avg_entities_in_system_mean: item.avg_entities_in_system_mean ?? 0,
            avg_entities_in_system_std_dev: item.avg_entities_in_system_std_dev ?? 0,
            avg_entities_in_system_min: item.avg_entities_in_system_min ?? 0,
            avg_entities_in_system_max: item.avg_entities_in_system_max ?? 0,

            // Total Activity Cost metrics
            total_activity_cost_mean: item.total_activity_cost_mean ?? 0,
            total_activity_cost_std_dev: item.total_activity_cost_std_dev ?? 0,
            total_activity_cost_min: item.total_activity_cost_min ?? 0,
            total_activity_cost_max: item.total_activity_cost_max ?? 0,

            // Total Resource Cost metrics
            total_resource_cost_mean: item.total_resource_cost_mean ?? 0,
            total_resource_cost_std_dev: item.total_resource_cost_std_dev ?? 0,
            total_resource_cost_min: item.total_resource_cost_min ?? 0,
            total_resource_cost_max: item.total_resource_cost_max ?? 0,

            // Total Cost metrics
            total_cost_mean: item.total_cost_mean ?? 0,
            total_cost_std_dev: item.total_cost_std_dev ?? 0,
            total_cost_min: item.total_cost_min ?? 0,
            total_cost_max: item.total_cost_max ?? 0,

            // Replication count
            num_replications: item.num_replications ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[scenarioCrossRep] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ScenarioCrossRepSchema,
        patch: {
            items
        }
    };
}
