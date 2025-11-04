// services/simulationData/collectors/activityCrossRepCollector.ts
import { ActivityCrossRepSummaryData } from '../../../collections/types/interfaces/ActivityCrossRepSummaryData';
import { ActivityCrossRepSchema } from '../../../collections/activityCrossRepSchema';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
// Note: CSV uses _std suffix, not _std_dev. We'll map them after parsing.
// Also, id, scenario_id, and scenario_name are already in CSV (no need to inject)
// Using plain string array instead of getRequiredColumnsFromType to avoid TypeScript errors
// since CSV column names don't match interface property names (_std vs _std_dev)
// NOTE: CSV is missing median and CV fields - we'll provide defaults in the mapper
export const requiredColumns: string[] = [
    'activity_id',
    'activity_name',
    'utilization_mean',
    'utilization_max',
    'utilization_std',  // CSV uses _std, not _std_dev
    'capacity_mean',
    'capacity_max',
    'capacity_std',
    'contents_mean',
    'contents_max',
    'contents_std',
    'queue_length_mean',
    'queue_length_max',
    'queue_length_std',
    'cycle_time_mean',
    // 'cycle_time_median',  // NOT in CSV - will default to 0
    'cycle_time_std',
    // 'cycle_time_cv',      // NOT in CSV - will default to 0
    'waiting_time_mean',
    // 'waiting_time_median', // NOT in CSV - will default to 0
    'waiting_time_std',
    // 'waiting_time_cv',     // NOT in CSV - will default to 0
    'blocked_time_mean',
    // 'blocked_time_median', // NOT in CSV - will default to 0
    'blocked_time_std',
    // 'blocked_time_cv',     // NOT in CSV - will default to 0
    'arrivals_mean',
    'arrivals_max',
    'arrivals_std',
    'captures_mean',
    'captures_max',
    'captures_std',
    'releases_mean',
    'releases_max',
    'releases_std'
];

/**
 * Fetches activity cross-replication summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of activity cross-replication summary data
 */
export async function fetchActivityCrossRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityCrossRepSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[activityCrossRep] Starting fetch operation`);
    conditionalLog(`[activityCrossRep] Container name: ${containerName}`);
    conditionalLog(`[activityCrossRep] Document ID: ${documentId}`);
    conditionalLog(`[activityCrossRep] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    // Note: CSV files are in cross_rep subfolder, and use _summary_summary naming
    const baseBlobName = 'cross_rep/activity_summary_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[activityCrossRep] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[activityCrossRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[activityCrossRep] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[activityCrossRep] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[activityCrossRep] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[activityCrossRep] - ${file}`));

                // Check if there's any file that might contain activity cross-rep data
                const activityFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('activity') &&
                    file.toLowerCase().includes('cross') &&
                    file.endsWith('.csv')
                );

                if (activityFiles.length > 0) {
                    conditionalLog(`[activityCrossRep] Found potential activity cross-rep files with different names:`);
                    activityFiles.forEach(file => conditionalLog(`[activityCrossRep] - ${file}`));
                }
            } else {
                conditionalLog(`[activityCrossRep] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[activityCrossRep] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[activityCrossRep] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[activityCrossRep] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[activityCrossRep] File exists. Fetching data...`);
        let result = await fetchCsvData<any>(  // Use 'any' since CSV has different column names
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[activityCrossRep] Fetched ${result.length} activity cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[activityCrossRep] First record sample (before mapping): ${JSON.stringify(result[0])}`);
        }

        // Map CSV column names to schema field names
        // CSV uses _std suffix, schema expects _std_dev
        // Also inject scenario_id, scenario_name, and generate composite ID
        const mappedResult: ActivityCrossRepSummaryData[] = result.map((item: any) => ({
            // Generate composite ID from scenario and activity
            id: `${scenarioId}_${item.activity_id}`,
            scenario_id: scenarioId,
            scenario_name: documentId,  // Use documentId as scenario name for now

            // Copy identifier fields
            activity_id: item.activity_id,
            activity_name: item.activity_name,

            // Map all _std fields to _std_dev
            utilization_mean: item.utilization_mean,
            utilization_max: item.utilization_max,
            utilization_std_dev: item.utilization_std,  // Map _std to _std_dev

            capacity_mean: item.capacity_mean,
            capacity_max: item.capacity_max,
            capacity_std_dev: item.capacity_std,

            contents_mean: item.contents_mean,
            contents_max: item.contents_max,
            contents_std_dev: item.contents_std,

            queue_length_mean: item.queue_length_mean,
            queue_length_max: item.queue_length_max,
            queue_length_std_dev: item.queue_length_std,

            cycle_time_mean: item.cycle_time_mean,
            cycle_time_median: 0,  // NOT in CSV, default to 0
            cycle_time_std_dev: item.cycle_time_std,
            cycle_time_cv: 0,  // NOT in CSV, default to 0

            waiting_time_mean: item.waiting_time_mean,
            waiting_time_median: 0,  // NOT in CSV, default to 0
            waiting_time_std_dev: item.waiting_time_std,
            waiting_time_cv: 0,  // NOT in CSV, default to 0

            blocked_time_mean: item.blocked_time_mean,
            blocked_time_median: 0,  // NOT in CSV, default to 0
            blocked_time_std_dev: item.blocked_time_std,
            blocked_time_cv: 0,  // NOT in CSV, default to 0

            arrivals_mean: item.arrivals_mean,
            arrivals_max: item.arrivals_max,
            arrivals_std_dev: item.arrivals_std,

            captures_mean: item.captures_mean,
            captures_max: item.captures_max,
            captures_std_dev: item.captures_std,

            releases_mean: item.releases_mean,
            releases_max: item.releases_max,
            releases_std_dev: item.releases_std
        }));

        conditionalLog(`[activityCrossRep] Mapped ${mappedResult.length} records with schema-compliant field names`);
        if (mappedResult.length > 0) {
            conditionalLog(`[activityCrossRep] First mapped record sample: ${JSON.stringify(mappedResult[0])}`);
        }

        // Replace result with mapped result
        result = mappedResult;

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: ActivityCrossRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                activity_id: String(item.activity_id || "Unknown"),
                activity_name: String(item.activity_name || "Unknown"),
                
                // Utilization metrics
                utilization_mean: item.utilization_mean ?? 0,
                utilization_max: item.utilization_max ?? 0,
                utilization_std_dev: item.utilization_std_dev ?? 0,
                
                // Capacity metrics
                capacity_mean: item.capacity_mean ?? 0,
                capacity_max: item.capacity_max ?? 0,
                capacity_std_dev: item.capacity_std_dev ?? 0,
                
                // Contents metrics
                contents_mean: item.contents_mean ?? 0,
                contents_max: item.contents_max ?? 0,
                contents_std_dev: item.contents_std_dev ?? 0,
                
                // Queue metrics
                queue_length_mean: item.queue_length_mean ?? 0,
                queue_length_max: item.queue_length_max ?? 0,
                queue_length_std_dev: item.queue_length_std_dev ?? 0,
                
                // Cycle time metrics
                cycle_time_mean: item.cycle_time_mean ?? 0,
                cycle_time_median: item.cycle_time_median ?? 0,
                cycle_time_std_dev: item.cycle_time_std_dev ?? 0,
                cycle_time_cv: item.cycle_time_cv ?? 0,
                
                // Waiting time metrics
                waiting_time_mean: item.waiting_time_mean ?? 0,
                waiting_time_median: item.waiting_time_median ?? 0,
                waiting_time_std_dev: item.waiting_time_std_dev ?? 0,
                waiting_time_cv: item.waiting_time_cv ?? 0,
                
                // Blocked time metrics
                blocked_time_mean: item.blocked_time_mean ?? 0,
                blocked_time_median: item.blocked_time_median ?? 0,
                blocked_time_std_dev: item.blocked_time_std_dev ?? 0,
                blocked_time_cv: item.blocked_time_cv ?? 0,
                
                // Flow statistics
                arrivals_mean: item.arrivals_mean ?? 0,
                arrivals_max: item.arrivals_max ?? 0,
                arrivals_std_dev: item.arrivals_std_dev ?? 0,
                captures_mean: item.captures_mean ?? 0,
                captures_max: item.captures_max ?? 0,
                captures_std_dev: item.captures_std_dev ?? 0,
                releases_mean: item.releases_mean ?? 0,
                releases_max: item.releases_max ?? 0,
                releases_std_dev: item.releases_std_dev ?? 0
            };

            return validItem;
        });

        conditionalLog(`[activityCrossRep] Validated and prepared ${validatedResult.length} activity cross-rep records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityCrossRep] Error fetching activity cross-rep data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares activity cross-replication summary data for Lucid update
 * @param data Array of activity cross-replication summary data
 * @returns Collection update for Lucid
 */
export function prepareActivityCrossRepUpdate(data: ActivityCrossRepSummaryData[]) {
    conditionalLog("[activityCrossRep] Starting activity cross-rep update preparation");
    conditionalLog(`[activityCrossRep] Processing ${data.length} rows of activity cross-rep data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[activityCrossRep] Processing item with activity_id ${item.activity_id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            activity_id: String(item.activity_id || "Unknown"),
            activity_name: String(item.activity_name || "Unknown"),
            
            // Utilization metrics
            utilization_mean: item.utilization_mean ?? 0,
            utilization_max: item.utilization_max ?? 0,
            utilization_std_dev: item.utilization_std_dev ?? 0,
            
            // Capacity metrics
            capacity_mean: item.capacity_mean ?? 0,
            capacity_max: item.capacity_max ?? 0,
            capacity_std_dev: item.capacity_std_dev ?? 0,
            
            // Contents metrics
            contents_mean: item.contents_mean ?? 0,
            contents_max: item.contents_max ?? 0,
            contents_std_dev: item.contents_std_dev ?? 0,
            
            // Queue metrics
            queue_length_mean: item.queue_length_mean ?? 0,
            queue_length_max: item.queue_length_max ?? 0,
            queue_length_std_dev: item.queue_length_std_dev ?? 0,
            
            // Cycle time metrics
            cycle_time_mean: item.cycle_time_mean ?? 0,
            cycle_time_median: item.cycle_time_median ?? 0,
            cycle_time_std_dev: item.cycle_time_std_dev ?? 0,
            cycle_time_cv: item.cycle_time_cv ?? 0,
            
            // Waiting time metrics
            waiting_time_mean: item.waiting_time_mean ?? 0,
            waiting_time_median: item.waiting_time_median ?? 0,
            waiting_time_std_dev: item.waiting_time_std_dev ?? 0,
            waiting_time_cv: item.waiting_time_cv ?? 0,
            
            // Blocked time metrics
            blocked_time_mean: item.blocked_time_mean ?? 0,
            blocked_time_median: item.blocked_time_median ?? 0,
            blocked_time_std_dev: item.blocked_time_std_dev ?? 0,
            blocked_time_cv: item.blocked_time_cv ?? 0,
            
            // Flow statistics
            arrivals_mean: item.arrivals_mean ?? 0,
            arrivals_max: item.arrivals_max ?? 0,
            arrivals_std_dev: item.arrivals_std_dev ?? 0,
            captures_mean: item.captures_mean ?? 0,
            captures_max: item.captures_max ?? 0,
            captures_std_dev: item.captures_std_dev ?? 0,
            releases_mean: item.releases_mean ?? 0,
            releases_max: item.releases_max ?? 0,
            releases_std_dev: item.releases_std_dev ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[activityCrossRep] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ActivityCrossRepSchema,
        patch: {
            items
        }
    };
}
