// services/simulationData/collectors/resourceCrossRepCollector.ts
import { ResourceCrossRepData } from '../../../collections/types/interfaces/ResourceCrossRepData';
import { ResourceCrossRepSchema } from '../../../collections/resourceCrossRepSchema';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<ResourceCrossRepData>([
    'id',
    'scenario_id',
    'scenario_name',
    'resource_id',
    'resource_name',
    'utilization_mean',
    'utilization_min',
    'utilization_max',
    'utilization_std_dev',
    'bottleneck_frequency'
]);

/**
 * Fetches resource cross-replication data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID (folder name within container)
 * @returns Array of resource cross-replication data
 */
export async function fetchResourceCrossRep(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ResourceCrossRepData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[resourceCrossRep] Starting fetch operation`);
    conditionalLog(`[resourceCrossRep] Container name: ${containerName}`);
    conditionalLog(`[resourceCrossRep] Document ID: ${documentId}`);
    conditionalLog(`[resourceCrossRep] Scenario ID: ${scenarioId}`);

    // Use the correct path structure: scenarioId/filename.csv
    const baseBlobName = 'resource_cross_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[resourceCrossRep] Target file path: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[resourceCrossRep] Checking if file exists at path: ${blobName}`);
        const exists = await blobExists(containerName, blobName);

        if (!exists) {
            conditionalLog(`[resourceCrossRep] WARNING: File does not exist at path: ${blobName}`);

            // List scenario folder contents to see what files are actually there
            conditionalLog(`[resourceCrossRep] Listing files in scenario folder: ${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);

            if (scenarioFiles.length > 0) {
                conditionalLog(`[resourceCrossRep] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[resourceCrossRep] - ${file}`));

                // Check if there's any file that might contain resource cross-rep data
                const resourceFiles = scenarioFiles.filter(file =>
                    file.toLowerCase().includes('resource') &&
                    file.toLowerCase().includes('cross') &&
                    file.endsWith('.csv')
                );

                if (resourceFiles.length > 0) {
                    conditionalLog(`[resourceCrossRep] Found potential resource cross-rep files with different names:`);
                    resourceFiles.forEach(file => conditionalLog(`[resourceCrossRep] - ${file}`));
                }
            } else {
                conditionalLog(`[resourceCrossRep] No files found in scenario folder: ${scenarioId}`);

                // Check if the scenario folder itself exists
                conditionalLog(`[resourceCrossRep] Checking top-level folders in container`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();

                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });

                conditionalLog(`[resourceCrossRep] Found top-level folders: ${Array.from(folders).join(', ')}`);

                if (!folders.has(scenarioId)) {
                    conditionalLog(`[resourceCrossRep] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }

            return [];
        }

        // Now fetch the data since we know the file exists
        conditionalLog(`[resourceCrossRep] File exists. Fetching data...`);
        let result = await fetchCsvData<ResourceCrossRepData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[resourceCrossRep] Fetched ${result.length} resource cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[resourceCrossRep] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: ResourceCrossRepData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || "Unknown"),
                scenario_name: String(item.scenario_name || "Unknown"),
                resource_id: String(item.resource_id || "Unknown"),
                resource_name: String(item.resource_name || "Unknown"),
                utilization_mean: item.utilization_mean ?? 0,
                utilization_min: item.utilization_min ?? 0,
                utilization_max: item.utilization_max ?? 0,
                utilization_std_dev: item.utilization_std_dev ?? 0,
                bottleneck_frequency: item.bottleneck_frequency ?? 0
            };

            return validItem;
        });

        conditionalLog(`[resourceCrossRep] Validated and prepared ${validatedResult.length} resource cross-rep records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[resourceCrossRep] Error fetching resource cross-rep data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares resource cross-replication data for Lucid update
 * @param data Array of resource cross-replication data
 * @returns Collection update for Lucid
 */
export function prepareResourceCrossRepUpdate(data: ResourceCrossRepData[]) {
    conditionalLog("[resourceCrossRep] Starting resource cross-rep update preparation");
    conditionalLog(`[resourceCrossRep] Processing ${data.length} rows of resource cross-rep data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[resourceCrossRep] Processing item with resource_id ${item.resource_id}`);

        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || "Unknown"),
            scenario_name: String(item.scenario_name || "Unknown"),
            resource_id: String(item.resource_id || "Unknown"),
            resource_name: String(item.resource_name || "Unknown"),
            utilization_mean: item.utilization_mean ?? 0,
            utilization_min: item.utilization_min ?? 0,
            utilization_max: item.utilization_max ?? 0,
            utilization_std_dev: item.utilization_std_dev ?? 0,
            bottleneck_frequency: item.bottleneck_frequency ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[resourceCrossRep] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ResourceCrossRepSchema,
        patch: {
            items
        }
    };
}
