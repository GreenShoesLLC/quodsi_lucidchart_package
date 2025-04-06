// src/services/modelDataService.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { ModelSchema } from "../collections/modelSchema";
import { ActionLogger } from '../utils/logging';
import { LoggingLevel } from "../utils/loggingLevels";

/**
 * Updates model data in the simulation_results datasource
 * @param action The asynchronous action context
 * @param documentId Document ID containing the model
 * @param scenarioId Page ID where the model is defined
 * @param loggingLevel Logging level to use (LoggingLevel enum or boolean for backward compatibility)
 * @param logger Optional logger instance
 * @returns Promise resolving when the update is complete
 */
export async function updateModelData(
    action: DataConnectorAsynchronousAction,
    documentId: string,
    scenarioId: string,
    loggingLevel: LoggingLevel | boolean = LoggingLevel.NORMAL,
    logger?: ActionLogger
): Promise<void> {
    // Create a local logger if none was provided
    // Handle backward compatibility with boolean parameter
    let logLevel: LoggingLevel;
    
    if (typeof loggingLevel === 'boolean') {
        logLevel = loggingLevel ? LoggingLevel.VERBOSE : LoggingLevel.MINIMAL;
    } else {
        logLevel = loggingLevel;
    }
    
    const log = logger || new ActionLogger('[ModelData]', logLevel);

    if (!scenarioId) {
        throw new Error('scenarioId is required for model data');
    }

    const modelData = {
        documentId,
        scenarioId: scenarioId
    };

    log.important(`=== Updating Model Data (scenarioId: ${scenarioId}) ===`);
    log.debug('Model data:', modelData);

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

    log.important(`=== Model Data Update Complete ===`);
}