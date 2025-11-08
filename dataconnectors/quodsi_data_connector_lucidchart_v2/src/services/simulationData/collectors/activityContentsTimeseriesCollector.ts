// services/simulationData/collectors/activityContentsTimeseriesCollector.ts
import { ActivityContentsTimeseriesData } from '../../../collections/types/interfaces/ActivityContentsTimeseriesData';
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
 * Fetches activity contents timeseries cross-replication data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @param fileName CSV file name (e.g., 'activity_contents_timeseries_cross_rep.csv')
 * @returns Array of activity contents timeseries data
 */
export async function fetchActivityContentsTimeseries(
    containerName: string,
    documentId: string,
    scenarioId: string,
    fileName: string = 'activity_contents_timeseries_cross_rep.csv'
): Promise<ActivityContentsTimeseriesData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[activityContentsTimeseries] Starting fetch operation`);
    conditionalLog(`[activityContentsTimeseries] Container name: ${containerName}`);
    conditionalLog(`[activityContentsTimeseries] Document ID: ${documentId}`);
    conditionalLog(`[activityContentsTimeseries] Scenario ID: ${scenarioId}`);
    conditionalLog(`[activityContentsTimeseries] File name: ${fileName}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    const baseBlobName = `cross_rep/${fileName}`;
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[activityContentsTimeseries] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[activityContentsTimeseries] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[activityContentsTimeseries] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[activityContentsTimeseries] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[activityContentsTimeseries] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[activityContentsTimeseries] - ${file}`));

                // Check if there's any file that might contain activity contents timeseries data
                const timeseriesFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('activity') &&
                    file.toLowerCase().includes('timeseries') &&
                    file.endsWith('.csv')
                );

                if (timeseriesFiles.length > 0) {
                    conditionalLog(`[activityContentsTimeseries] Found potential activity timeseries files with different names:`);
                    timeseriesFiles.forEach(file => conditionalLog(`[activityContentsTimeseries] - ${file}`));
                }
            } else {
                conditionalLog(`[activityContentsTimeseries] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[activityContentsTimeseries] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[activityContentsTimeseries] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[activityContentsTimeseries] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[activityContentsTimeseries] File exists. Fetching data...`);
        const result = await fetchCsvData<ActivityContentsTimeseriesData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[activityContentsTimeseries] Fetched ${result.length} activity contents timeseries records`);
        if (result.length > 0) {
            conditionalLog(`[activityContentsTimeseries] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Note: No field mapping needed since CSV column names match interface exactly
        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            const validItem: ActivityContentsTimeseriesData = {
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                object_id: String(item.object_id || "Unknown"),
                series_type: String(item.series_type || "contents"),
                period_start_clock: item.period_start_clock ?? 0,
                mean: item.mean ?? 0,
                std: item.std ?? 0,
                min: item.min ?? 0,
                max: item.max ?? 0,
                sample_size: item.sample_size ?? 0
            };

            return validItem;
        });

        conditionalLog(`[activityContentsTimeseries] Validated and prepared ${validatedResult.length} activity contents timeseries records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityContentsTimeseries] Error fetching activity contents timeseries data: ${error.message}`);
        throw error;
    }
}
