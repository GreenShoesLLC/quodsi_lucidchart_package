// services/simulationData/collectors/entityThroughputTimeseriesCollector.ts
import { EntityThroughputTimeseriesData } from '../../../collections/types/interfaces/EntityThroughputTimeseriesData';
import { fetchCsvData, blobExists, listBlobs } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';

// Required columns for validation
// Note: These match the CSV headers exactly, no field name mapping needed
export const requiredColumns: string[] = [
    'scenario_id',
    'scenario_name',
    'object_id',
    'series_type',
    'period_start_clock',
    'mean',
    'std',
    'min',
    'max',
    'sample_size'
];

/**
 * Fetches entity throughput timeseries cross-replication data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @param fileName CSV file name (e.g., 'entity_throughput_timeseries_cross_rep.csv')
 * @returns Array of entity throughput timeseries data
 */
export async function fetchEntityThroughputTimeseries(
    containerName: string,
    documentId: string,
    scenarioId: string,
    fileName: string = 'entity_throughput_timeseries_cross_rep.csv'
): Promise<EntityThroughputTimeseriesData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[entityThroughputTimeseries] Starting fetch operation`);
    conditionalLog(`[entityThroughputTimeseries] Container name: ${containerName}`);
    conditionalLog(`[entityThroughputTimeseries] Document ID: ${documentId}`);
    conditionalLog(`[entityThroughputTimeseries] Scenario ID: ${scenarioId}`);
    conditionalLog(`[entityThroughputTimeseries] File name: ${fileName}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    const baseBlobName = `cross_rep/${fileName}`;
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[entityThroughputTimeseries] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[entityThroughputTimeseries] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[entityThroughputTimeseries] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[entityThroughputTimeseries] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[entityThroughputTimeseries] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[entityThroughputTimeseries] - ${file}`));

                // Check if there's any file that might contain entity throughput timeseries data
                const timeseriesFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('entity') &&
                    file.toLowerCase().includes('timeseries') &&
                    file.endsWith('.csv')
                );

                if (timeseriesFiles.length > 0) {
                    conditionalLog(`[entityThroughputTimeseries] Found potential entity timeseries files with different names:`);
                    timeseriesFiles.forEach(file => conditionalLog(`[entityThroughputTimeseries] - ${file}`));
                }
            } else {
                conditionalLog(`[entityThroughputTimeseries] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[entityThroughputTimeseries] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[entityThroughputTimeseries] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[entityThroughputTimeseries] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[entityThroughputTimeseries] File exists. Fetching data...`);
        const result = await fetchCsvData<EntityThroughputTimeseriesData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityThroughputTimeseries] Fetched ${result.length} entity throughput timeseries records`);
        if (result.length > 0) {
            conditionalLog(`[entityThroughputTimeseries] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Note: No field mapping needed since CSV column names match interface exactly
        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            const validItem: EntityThroughputTimeseriesData = {
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                object_id: String(item.object_id || "Unknown"),
                series_type: String(item.series_type || "throughput"),
                period_start_clock: item.period_start_clock ?? 0,
                mean: item.mean ?? 0,
                std: item.std ?? 0,
                min: item.min ?? 0,
                max: item.max ?? 0,
                sample_size: item.sample_size ?? 0
            };

            return validItem;
        });

        conditionalLog(`[entityThroughputTimeseries] Validated and prepared ${validatedResult.length} entity throughput timeseries records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[entityThroughputTimeseries] Error fetching entity throughput timeseries data: ${error.message}`);
        throw error;
    }
}
