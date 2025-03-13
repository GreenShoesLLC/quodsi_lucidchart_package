// services/simulationData/collectors/resourceUtilization.ts
import { ResourceUtilizationSchema } from '../../../collections/resourceUtilizationSchema';
import { ResourceUtilizationData } from '../../../collections/types/interfaces/ResourceUtilizationData';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation - based on the actual CSV structure
export const requiredColumns = getRequiredColumnsFromType<ResourceUtilizationData>([
    'id',
    'scenario_id',
    'scenario_name',
    'resource_id',
    'resource_name',
    'utilization_mean'
    // Only include the essential columns to allow for flexibility
]);

/**
 * Fetches resource utilization data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID
 * @returns Array of resource utilization data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<ResourceUtilizationData[]> {
    const baseBlobName = 'resource_utilization.csv';
    const blobName = `${scenarioId}/${baseBlobName}`
    conditionalLog(`[resourceUtilization] Attempting to fetch resource utilization data from: ${containerName}/${blobName}`);

    try {
        // Try first at the root level
        let result = await fetchCsvData<ResourceUtilizationData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        // If we didn't find any data at the root level, try in the results folder
        if (result.length === 0) {
            conditionalLog(`[resourceUtilization] No data at root level, trying in results folder...`);

            const altBlobName = 'results/resource_utilization.csv';
            result = await fetchCsvData<ResourceUtilizationData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[resourceUtilization] Fetched ${result.length} resource utilization records`);
        if (result.length > 0) {
            conditionalLog(`[resourceUtilization] First record sample: ${JSON.stringify(result[0])}`);
        }

        // No mapping is needed since we're using the same field names as the CSV
        // Just provide defaults for any missing fields to prevent null values
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all fields
            const validItem: ResourceUtilizationData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || 'Unknown'),
                scenario_name: String(item.scenario_name || "Unknown"),
                resource_id: String(item.resource_id || 'Unknown'),
                resource_name: String(item.resource_name || 'Unknown'),
                
                // Utilization metrics
                utilization_mean: item.utilization_mean ?? 0,
                utilization_min: item.utilization_min ?? 0,
                utilization_max: item.utilization_max ?? 0,
                utilization_std_dev: item.utilization_std_dev ?? 0,
                
                // Summary metrics
                bottleneck_frequency: item.bottleneck_frequency ?? 0
            };

            return validItem;
        });

        conditionalLog(`[resourceUtilization] Validated and prepared ${validatedResult.length} resource utilization records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[resourceUtilization] Error fetching resource utilization data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares resource utilization data for Lucid update
 * @param data Array of resource utilization data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: ResourceUtilizationData[]) {
    conditionalLog("[resourceUtilization] Starting resource utilization update preparation");
    conditionalLog(`[resourceUtilization] Processing ${data.length} rows of resource utilization data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Create a cleaned object with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            resource_id: String(item.resource_id || 'Unknown'),
            resource_name: String(item.resource_name || 'Unknown'),
            
            // Utilization metrics
            utilization_mean: item.utilization_mean ?? 0,
            utilization_min: item.utilization_min ?? 0,
            utilization_max: item.utilization_max ?? 0,
            utilization_std_dev: item.utilization_std_dev ?? 0,
            
            // Summary metrics
            bottleneck_frequency: item.bottleneck_frequency ?? 0
        };

        // Add to our collection using the ID as the key
        items.set(`"${item.id || 'Unknown'}"`, cleanedItem);
    });

    conditionalLog(`[resourceUtilization] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: ResourceUtilizationSchema,
        patch: {
            items
        }
    };
}
