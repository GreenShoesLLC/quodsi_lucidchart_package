// services/simulationData/collectors/activityUtilization.ts
import { ActivityUtilizationData } from '../../../collections/types/interfaces/ActivityUtilizationData';
import { ActivityUtilizationSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ActivityUtilizationData>([
    'id',
    'scenario_id',
    'scenario_name',
    'activity_id',
    'activity_name',
    'utilization_mean',
    'utilization_max',
    'utilization_std_dev',
    'capacity_mean',
    'capacity_max',
    'capacity_std_dev',
    'contents_mean',
    'contents_max',
    'contents_std_dev',
    'queue_length_mean',
    'queue_length_max',
    'queue_length_std_dev'
]);

/**
 * Fetches activity utilization data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of activity utilization data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ActivityUtilizationData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[activityUtilization] ENHANCED LOGGING: Starting fetch operation`);
    conditionalLog(`[activityUtilization] Container name: ${containerName}`);
    conditionalLog(`[activityUtilization] Document ID: ${documentId}`);
    conditionalLog(`[activityUtilization] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/filename.csv
    const baseBlobName = 'activity_utilization.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[activityUtilization] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[activityUtilization] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);
        
        if (!exists) {
            conditionalLog(`[activityUtilization] WARNING: File does not exist at path: ${blobName}`);
            
            // List scenario folder contents to see what files are actually there
            conditionalLog(`[activityUtilization] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);
            
            if (scenarioFiles.length > 0) {
                conditionalLog(`[activityUtilization] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[activityUtilization] - ${file}`));
                
                // Check if there's any file that might contain activity utilization data
                const activityFiles = scenarioFiles.filter(file => 
                    file.toLowerCase().includes('activity') && 
                    file.toLowerCase().includes('utilization') &&
                    file.endsWith('.csv')
                );
                
                if (activityFiles.length > 0) {
                    conditionalLog(`[activityUtilization] Found potential activity utilization files with different names:`);
                    activityFiles.forEach(file => conditionalLog(`[activityUtilization] - ${file}`));
                }
            } else {
                conditionalLog(`[activityUtilization] No files found in scenario folder: ${scenarioId}`);
                
                // Check if the scenario folder itself exists
                conditionalLog(`[activityUtilization] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();
                
                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });
                
                conditionalLog(`[activityUtilization] Found top-level folders: ${Array.from(folders).join(', ')}`);
                
                if (!folders.has(scenarioId)) {
                    conditionalLog(`[activityUtilization] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }
            
            return [];
        }
        
        // Now fetch the data since we know the file exists
        conditionalLog(`[activityUtilization] File exists. Fetching data...`);
        let result = await fetchCsvData<ActivityUtilizationData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );


        conditionalLog(`[activityUtilization] Fetched ${result.length} activity utilization records`);
        if (result.length > 0) {
            conditionalLog(`[activityUtilization] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: ActivityUtilizationData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                activity_id: String(item.activity_id || "Unknown"),
                activity_name: String(item.activity_name || "Unknown"),
                utilization_mean: item.utilization_mean ?? 0,
                utilization_max: item.utilization_max ?? 0,
                utilization_std_dev: item.utilization_std_dev ?? 0,
                capacity_mean: item.capacity_mean ?? 0,
                capacity_max: item.capacity_max ?? 0,
                capacity_std_dev: item.capacity_std_dev ?? 0,
                contents_mean: item.contents_mean ?? 0,
                contents_max: item.contents_max ?? 0,
                contents_std_dev: item.contents_std_dev ?? 0,
                queue_length_mean: item.queue_length_mean ?? 0,
                queue_length_max: item.queue_length_max ?? 0,
                queue_length_std_dev: item.queue_length_std_dev ?? 0
            };

            return validItem;
        });

        conditionalLog(`[activityUtilization] Validated and prepared ${validatedResult.length} activity utilization records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[activityUtilization] Error fetching activity utilization data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares activity utilization data for Lucid update
 * @param data Array of activity utilization data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ActivityUtilizationData[]) {
    conditionalLog("[activityUtilization] Starting activity utilization update preparation");
    conditionalLog(`[activityUtilization] Processing ${data.length} rows of activity utilization data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Ensure ID is never null or undefined
        // const id = item.id || `activity_${Math.random().toString(36).substring(2, 10)}`;

        conditionalLog(`[activityUtilization] Processing item with activity_id ${item.activity_id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            activity_id: String(item.activity_id || "Unknown"),
            activity_name: String(item.activity_name || "Unknown"),
            utilization_mean: item.utilization_mean ?? 0,
            utilization_max: item.utilization_max ?? 0,
            utilization_std_dev: item.utilization_std_dev ?? 0,
            capacity_mean: item.capacity_mean ?? 0,
            capacity_max: item.capacity_max ?? 0,
            capacity_std_dev: item.capacity_std_dev ?? 0,
            contents_mean: item.contents_mean ?? 0,
            contents_max: item.contents_max ?? 0,
            contents_std_dev: item.contents_std_dev ?? 0,
            queue_length_mean: item.queue_length_mean ?? 0,
            queue_length_max: item.queue_length_max ?? 0,
            queue_length_std_dev: item.queue_length_std_dev ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[activityUtilization] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ActivityUtilizationSchema,
        patch: {
            items
        }
    };
}
