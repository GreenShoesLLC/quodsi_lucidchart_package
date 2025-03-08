// src/services/scenarioResultsService.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ScenarioResultsSchema } from "../collections/scenarioResultsSchema";
import { ActionLogger } from '../utils/logging';

/**
 * Updates or creates a scenario results entry in the simulation_results data source
 * @param action The asynchronous action context
 * @param documentId Document ID where the scenario is running
 * @param scenarioId Scenario ID (UUID, with baseline as 00000000-0000-0000-0000-000000000000)
 * @param verbose Whether to log verbose output
 * @param logger Optional logger instance
 * @returns Promise resolving with success status and optional error message
 */
export async function updateScenarioResultsData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    scenarioId: string,
    verbose: boolean = true,
    logger?: ActionLogger
): Promise<{ success: boolean, error?: string }> {
    // Create a local logger if none was provided
    const log = logger || new ActionLogger('[ScenarioResults]', verbose);

    try {
        log.info(`=== Starting scenario results update ===`);
        log.info(`Parameters: documentId=${documentId}, scenarioId=${scenarioId}`);
        
        // Validate the key parameters
        if (!documentId) {
            const errMsg = 'documentId is required for scenario results';
            log.error(errMsg);
            return { success: false, error: errMsg };
        }
        
        if (!scenarioId) {
            const errMsg = 'scenarioId is required for scenario results';
            log.error(errMsg);
            return { success: false, error: errMsg };
        }

        // Create a composite ID using documentId and scenarioId
        const compositeId = `${documentId}_${scenarioId}`;
        log.info(`Created composite ID: ${compositeId}`);

        // Data object includes the composite ID
        const data = {
            id: compositeId
        };

        log.info(`Updating scenario results with composite ID: ${compositeId}`);

        try {
            await action.client.update({
                dataSourceName: "simulation_results",
                collections: {
                    "scenario_results": {
                        schema: ScenarioResultsSchema,
                        patch: {
                            items: new Map([
                                [`"${compositeId}"`, data]  // Quote the key as before
                            ])
                        }
                    }
                }
            });
            
            log.info(`=== Scenario Results Update Complete ===`);
            return { success: true };
        } catch (updateError) {
            log.error(`Error during update: ${updateError.message}`);
            if (updateError.stack) {
                log.error(`Stack trace: ${updateError.stack}`);
            }
            return { 
                success: false, 
                error: `Failed to update scenario results: ${updateError.message}` 
            };
        }
    } catch (error) {
        log.error(`Unexpected error: ${error.message}`);
        if (error.stack) {
            log.error(`Stack trace: ${error.stack}`);
        }
        return { 
            success: false, 
            error: `Unexpected error: ${error.message}` 
        };
    }
}

/**
 * Retrieves all scenario result IDs from the simulation_results data source
 * @param action The asynchronous action context
 * @param verbose Whether to log verbose output
 * @param logger Optional logger instance
 * @returns Promise resolving with an array of scenario result IDs
 */
export async function getScenarioResultIds(
    action: DataConnectorAsynchronousAction,
    verbose: boolean = true,
    logger?: ActionLogger
): Promise<string[]> {
    // Create a local logger if none was provided
    const log = logger || new ActionLogger('[ScenarioResults]', verbose);

    log.info(`=== Retrieving Scenario Result IDs ===`);

    // Check if the collection exists in the context
    const allScenarioResultIds = action.context.documentCollections?.['scenario_results'] || [];

    log.info(`Found ${allScenarioResultIds.length} raw scenario result IDs`);

    // Parse all IDs and create a map of valid ones
    const parsedIds = new Map<string, string>();

    for (const id of allScenarioResultIds) {
        try {
            const parsed = parseScenarioResultId(id);

            // Only include IDs where documentId is non-empty
            if (parsed.documentId && parsed.documentId.length > 0) {
                // Create a deduplication key based on the parsed values
                const dedupeKey = `${parsed.documentId}_${parsed.scenarioId}`;

                // Only add if this combination doesn't already exist
                if (!parsedIds.has(dedupeKey)) {
                    parsedIds.set(dedupeKey, id);
                }
            }
        } catch (e) {
            log.error(`Error parsing ID ${id}: ${e.message}`);
        }
    }

    // Get the unique, valid IDs
    const validIds = Array.from(parsedIds.values());

    log.info(`After filtering, found ${validIds.length} valid unique scenario result IDs`);

    return validIds;
}

/**
 * Parses a scenario ID string into its component parts
 * @param scenarioId The scenario ID (might include quotes, format should be "documentId_scenarioId")
 * @returns An object with documentId and scenarioId properties
 */
export function parseScenarioResultId(compositeId: string): { documentId: string, scenarioId: string } {
    // Remove quotes if present
    const cleanId = compositeId.replace(/^"(.*)"$/, '$1');
    
    // Split the composite ID by underscore
    const parts = cleanId.split('_');
    
    // If there's at least one underscore, extract documentId and scenarioId
    if (parts.length >= 2) {
        // Last part is scenarioId, everything else is documentId (in case documentId has underscores)
        const scenarioId = parts.pop() || '';
        const documentId = parts.join('_');
        
        return {
            documentId,
            scenarioId
        };
    }
    
    // If no underscore, assume the entire string is a scenarioId
    return {
        documentId: "",
        scenarioId: cleanId
    };
}