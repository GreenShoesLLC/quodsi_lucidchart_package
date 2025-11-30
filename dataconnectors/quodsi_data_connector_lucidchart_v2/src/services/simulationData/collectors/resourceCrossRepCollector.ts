// services/simulationData/collectors/resourceCrossRepCollector.ts
import { ResourceCrossRepData } from '../../../collections/types/interfaces/ResourceCrossRepData';
import { ResourceCrossRepSchema } from '../../../collections/resourceCrossRepSchema';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { prepareCollectionUpdate } from '../collectionUpdater';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
// Note: CSV uses utilization_rate_* (not utilization_*), and utilization_rate_std (not _std_dev)
// CSV is missing id/scenario_id/scenario_name and bottleneck_frequency - these will be injected during mapping
// Using plain string array instead of getRequiredColumnsFromType to avoid TypeScript errors
// since CSV column names don't match interface property names
export const requiredColumns: string[] = [
    'resource_id',
    'resource_name',
    'utilization_rate_mean',  // CSV uses utilization_rate_*, not utilization_*
    'utilization_rate_min',
    'utilization_rate_max',
    'utilization_rate_std',  // CSV uses _std, not _std_dev
    // 'bottleneck_frequency'  // NOT in CSV - will default to 0
    // Cost metrics (CSV uses _std suffix)
    'seize_cost_mean',
    'seize_cost_std',
    'seize_cost_min',
    'seize_cost_max',
    'utilization_cost_mean',
    'utilization_cost_std',
    'utilization_cost_min',
    'utilization_cost_max',
    'idle_cost_mean',
    'idle_cost_std',
    'idle_cost_min',
    'idle_cost_max',
    'total_cost_mean',
    'total_cost_std',
    'total_cost_min',
    'total_cost_max'
];

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

    // Use the correct path structure: scenarioId/cross_rep/filename.csv
    // Note: CSV files are in cross_rep subfolder, and use _summary_summary naming
    const baseBlobName = 'cross_rep/resource_summary_summary.csv';
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
        let result = await fetchCsvData<any>(  // Use 'any' since CSV has different column names
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[resourceCrossRep] Fetched ${result.length} resource cross-rep records`);
        if (result.length > 0) {
            conditionalLog(`[resourceCrossRep] First record sample (before mapping): ${JSON.stringify(result[0])}`);
        }

        // Map CSV column names to schema field names
        // CSV uses utilization_rate_* prefix, schema expects utilization_*
        // CSV uses utilization_rate_std suffix, schema expects utilization_std_dev
        // CSV is missing bottleneck_frequency - will default to 0
        // Also inject scenario_id, scenario_name, and generate composite ID
        const mappedResult: ResourceCrossRepData[] = result.map((item: any) => ({
            // Generate composite ID from scenario and resource
            id: `${scenarioId}_${item.resource_id}`,
            scenario_id: scenarioId,
            scenario_name: documentId,  // Use documentId as scenario name for now

            // Copy identifier fields
            resource_id: item.resource_id,
            resource_name: item.resource_name,

            // Map utilization_rate_* to utilization_*, and _std to _std_dev
            utilization_mean: item.utilization_rate_mean,  // Map utilization_rate_mean to utilization_mean
            utilization_min: item.utilization_rate_min,    // Map utilization_rate_min to utilization_min
            utilization_max: item.utilization_rate_max,    // Map utilization_rate_max to utilization_max
            utilization_std_dev: item.utilization_rate_std,  // Map utilization_rate_std to utilization_std_dev

            // Bottleneck frequency not in CSV - default to 0
            bottleneck_frequency: 0,  // NOT in CSV, default to 0

            // Cost metrics (map _std to _std_dev)
            seize_cost_mean: item.seize_cost_mean,
            seize_cost_std_dev: item.seize_cost_std,
            seize_cost_min: item.seize_cost_min,
            seize_cost_max: item.seize_cost_max,
            utilization_cost_mean: item.utilization_cost_mean,
            utilization_cost_std_dev: item.utilization_cost_std,
            utilization_cost_min: item.utilization_cost_min,
            utilization_cost_max: item.utilization_cost_max,
            idle_cost_mean: item.idle_cost_mean,
            idle_cost_std_dev: item.idle_cost_std,
            idle_cost_min: item.idle_cost_min,
            idle_cost_max: item.idle_cost_max,
            total_cost_mean: item.total_cost_mean,
            total_cost_std_dev: item.total_cost_std,
            total_cost_min: item.total_cost_min,
            total_cost_max: item.total_cost_max
        }));

        conditionalLog(`[resourceCrossRep] Mapped ${mappedResult.length} records with schema-compliant field names`);
        if (mappedResult.length > 0) {
            conditionalLog(`[resourceCrossRep] First mapped record sample: ${JSON.stringify(mappedResult[0])}`);
        }

        // Replace result with mapped result
        result = mappedResult;

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
                bottleneck_frequency: item.bottleneck_frequency ?? 0,
                // Cost metrics
                seize_cost_mean: item.seize_cost_mean ?? 0,
                seize_cost_std_dev: item.seize_cost_std_dev ?? 0,
                seize_cost_min: item.seize_cost_min ?? 0,
                seize_cost_max: item.seize_cost_max ?? 0,
                utilization_cost_mean: item.utilization_cost_mean ?? 0,
                utilization_cost_std_dev: item.utilization_cost_std_dev ?? 0,
                utilization_cost_min: item.utilization_cost_min ?? 0,
                utilization_cost_max: item.utilization_cost_max ?? 0,
                idle_cost_mean: item.idle_cost_mean ?? 0,
                idle_cost_std_dev: item.idle_cost_std_dev ?? 0,
                idle_cost_min: item.idle_cost_min ?? 0,
                idle_cost_max: item.idle_cost_max ?? 0,
                total_cost_mean: item.total_cost_mean ?? 0,
                total_cost_std_dev: item.total_cost_std_dev ?? 0,
                total_cost_min: item.total_cost_min ?? 0,
                total_cost_max: item.total_cost_max ?? 0
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
            bottleneck_frequency: item.bottleneck_frequency ?? 0,
            // Cost metrics
            seize_cost_mean: item.seize_cost_mean ?? 0,
            seize_cost_std_dev: item.seize_cost_std_dev ?? 0,
            seize_cost_min: item.seize_cost_min ?? 0,
            seize_cost_max: item.seize_cost_max ?? 0,
            utilization_cost_mean: item.utilization_cost_mean ?? 0,
            utilization_cost_std_dev: item.utilization_cost_std_dev ?? 0,
            utilization_cost_min: item.utilization_cost_min ?? 0,
            utilization_cost_max: item.utilization_cost_max ?? 0,
            idle_cost_mean: item.idle_cost_mean ?? 0,
            idle_cost_std_dev: item.idle_cost_std_dev ?? 0,
            idle_cost_min: item.idle_cost_min ?? 0,
            idle_cost_max: item.idle_cost_max ?? 0,
            total_cost_mean: item.total_cost_mean ?? 0,
            total_cost_std_dev: item.total_cost_std_dev ?? 0,
            total_cost_min: item.total_cost_min ?? 0,
            total_cost_max: item.total_cost_max ?? 0
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
