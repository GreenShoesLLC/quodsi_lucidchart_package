// src/services/modelDataService.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ModelSchema } from "../collections/modelSchema";
import { ActionLogger } from '../utils/logging';

/**
 * Updates model data in the simulation_results datasource
 * @param action The asynchronous action context
 * @param documentId Document ID containing the model
 * @param scenarioId Page ID where the model is defined
 * @param verbose Whether to log verbose output
 * @param logger Optional logger instance
 * @returns Promise resolving when the update is complete
 */
export async function updateModelData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    scenarioId: string,
    verbose: boolean = true,
    logger?: ActionLogger
): Promise<void> {
    // Create a local logger if none was provided
    const log = logger || new ActionLogger('[ModelData]', verbose);

    if (!scenarioId) {
        throw new Error('scenarioId is required for model data');
    }

    const modelData = {
        documentId,
        scenarioId: scenarioId
    };

    log.info(`=== Updating Model Data (scenarioId: ${scenarioId}) ===`);

    await action.client.update({
        dataSourceName: "simulation_results",
        collections: {
            "Models": {
                schema: ModelSchema,
                patch: {
                    items: new Map([
                        [`"${scenarioId}"`, modelData]  // Ensure the key is properly quoted
                    ])
                }
            }
        }
    });

    log.info(`=== Model Data Update Complete ===`);
}
