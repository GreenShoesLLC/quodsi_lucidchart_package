// services/simulationData/collectors/entityThroughputRepSummary.ts

import { EntityThroughputRepSummarySchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType, blobExists, listBlobs } from '../csvParser';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { ActionLogger } from '../../../utils/logging';
import { LoggingLevel } from '../../../utils/loggingLevels';
import { SerializedFields } from 'lucid-extension-sdk';
import { EntityThroughputRepSummaryData } from '../../../collections/types/interfaces/EntityThroughputRepSummaryData';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<EntityThroughputRepSummaryData>([
    'id',
    'scenario_id',
    'scenario_name',
    'entity_id',
    'entity_name',
    'rep',
    'count',
    'completed_count',
    'in_progress_count',
    'throughput_rate'
]);

/**
 * Fetches entity throughput rep summary data from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID to use as folder prefix
 * @returns Array of entity throughput rep summary data
 */
export async function fetchData(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<EntityThroughputRepSummaryData[]> {
    // Enhanced logging to help diagnose issues
    conditionalLog(`[entityThroughputRepSummary] ENHANCED LOGGING: Starting fetch operation`);
    conditionalLog(`[entityThroughputRepSummary] Container name: ${containerName}`);
    conditionalLog(`[entityThroughputRepSummary] Document ID: ${documentId}`);
    conditionalLog(`[entityThroughputRepSummary] Scenario ID: ${scenarioId}`);
    
    // Fixed: Use ONLY the correct path structure: scenarioId/filename.csv
    const baseBlobName = 'entity_throughput_rep_summary.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    conditionalLog(`[entityThroughputRepSummary] TARGET FILE PATH: ${containerName}/${blobName}`);

    try {
        // Check if the blob exists before trying to fetch it
        conditionalLog(`[entityThroughputRepSummary] Checking if file exists at path: ${containerName}/${blobName}`);
        const exists = await blobExists(containerName, blobName);
        
        if (!exists) {
            conditionalLog(`[entityThroughputRepSummary] WARNING: File does not exist at path: ${containerName}/${blobName}`);
            
            // List scenario folder contents to see what files are actually there
            conditionalLog(`[entityThroughputRepSummary] Listing files in scenario folder: ${containerName}/${scenarioId}`);
            const scenarioFiles = await listBlobs(containerName, scenarioId);
            
            if (scenarioFiles.length > 0) {
                conditionalLog(`[entityThroughputRepSummary] Found ${scenarioFiles.length} files in scenario folder:`);
                scenarioFiles.forEach(file => conditionalLog(`[entityThroughputRepSummary] - ${file}`));
                
                // Check if there's any file that might contain entity throughput data
                const throughputFiles = scenarioFiles.filter(file => 
                    file.toLowerCase().includes('throughput') && 
                    file.endsWith('.csv')
                );
                
                if (throughputFiles.length > 0) {
                    conditionalLog(`[entityThroughputRepSummary] Found potential throughput files with different names:`);
                    throughputFiles.forEach(file => conditionalLog(`[entityThroughputRepSummary] - ${file}`));
                    
                    // If we found just one potential file, try using it
                    if (throughputFiles.length === 1) {
                        conditionalLog(`[entityThroughputRepSummary] Attempting to use alternative file: ${throughputFiles[0]}`);
                        const result = await fetchCsvData<EntityThroughputRepSummaryData>(
                            containerName,
                            throughputFiles[0],
                            documentId,
                            requiredColumns
                        );
                        
                        if (result.length > 0) {
                            conditionalLog(`[entityThroughputRepSummary] Successfully loaded ${result.length} records from alternative file`);
                            return result;
                        }
                    }
                }
            } else {
                conditionalLog(`[entityThroughputRepSummary] No files found in scenario folder ${scenarioId}`);
                
                // Check if the scenario folder itself exists
                conditionalLog(`[entityThroughputRepSummary] Checking top-level folders in container ${containerName}`);
                const topLevelBlobs = await listBlobs(containerName);
                const folders = new Set<string>();
                
                topLevelBlobs.forEach(blob => {
                    const parts = blob.split('/');
                    if (parts.length > 1) {
                        folders.add(parts[0]);
                    }
                });
                
                conditionalLog(`[entityThroughputRepSummary] Found top-level folders: ${Array.from(folders).join(', ')}`);
                
                if (!folders.has(scenarioId)) {
                    conditionalLog(`[entityThroughputRepSummary] WARNING: Scenario folder ${scenarioId} not found in container!`);
                }
            }
            
            return [];
        }
        
        // Now fetch the data since we know the file exists
        conditionalLog(`[entityThroughputRepSummary] File exists at ${containerName}/${blobName}. Fetching data...`);
        let result = await fetchCsvData<EntityThroughputRepSummaryData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        conditionalLog(`[entityThroughputRepSummary] Fetched ${result.length} entity throughput records`);
        if (result.length > 0) {
            conditionalLog(`[entityThroughputRepSummary] First record sample: ${JSON.stringify(result[0])}`);
        }

        // Validate and provide defaults for any missing fields
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: EntityThroughputRepSummaryData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || 'Unknown'),
                scenario_name: String(item.scenario_name || "Unknown"),
                entity_id: String(item.entity_id || 'Unknown'),
                entity_name: String(item.entity_name || 'Unknown'),
                rep: item.rep || 0,
                count: item.count || 0,
                completed_count: item.completed_count || 0,
                in_progress_count: item.in_progress_count || 0,
                throughput_rate: item.throughput_rate || 0
            };

            return validItem;
        });

        conditionalLog(`[entityThroughputRepSummary] Validated and prepared ${validatedResult.length} entity throughput records`);

        return validatedResult;
    } catch (error) {
        conditionalError(`[entityThroughputRepSummary] Error fetching entity throughput data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares entity throughput rep summary data for Lucid update
 * @param data Array of entity throughput rep summary data
 * @returns Collection update for Lucid
 */
export function prepareUpdate(data: EntityThroughputRepSummaryData[]) {
    conditionalLog("[entityThroughputRepSummary] Starting entity throughput update preparation");
    conditionalLog(`[entityThroughputRepSummary] Processing ${data.length} rows of entity throughput data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        conditionalLog(`[entityThroughputRepSummary] Processing item: ${JSON.stringify(item, null, 2)}`);

        // Create a completely new object with ONLY the fields we need
        // Including our new synthetic ID field
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            entity_id: String(item.entity_id || 'Unknown'),
            entity_name: String(item.entity_name || 'Unknown'),
            rep: item.rep || 0,
            count: item.count || 0,
            completed_count: item.completed_count || 0,
            in_progress_count: item.in_progress_count || 0,
            throughput_rate: item.throughput_rate || 0
        };

        conditionalLog(`[entityThroughputRepSummary] Cleaned item with ID ${item.id}: ${JSON.stringify(cleanedItem, null, 2)}`);

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[entityThroughputRepSummary] Final map has ${items.size} items`);

    // Return the schema and patch directly
    return {
        schema: EntityThroughputRepSummarySchema,
        patch: {
            items
        }
    };
}
