// actions/importSimulationResultsAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { setStorageVerboseLogging } from "../services/azureStorageService";
import { createSimulationImportService } from "../services";
import { ActionLogger } from '../utils/logging';

// Set to true to enable verbose logging for import action
const IMPORT_ACTION_VERBOSE_LOGGING = true;

export const importSimulationResultsAction = async (action: DataConnectorAsynchronousAction) => {
    // Create a simple ID for this action instance
    const actionId = Math.random().toString(36).substring(2, 10);
    const logger = new ActionLogger(`[Import:${actionId}]`, IMPORT_ACTION_VERBOSE_LOGGING);

    try {
        logger.info(`=== Import Simulation Results Action Started ===`);
        logger.info(`Action data:`, JSON.stringify(action.data, null, 2));

        // Set up verbose logging for all components
        setStorageVerboseLogging(IMPORT_ACTION_VERBOSE_LOGGING);

        // Get the data from action.data with required scenarioId
        const data = action.data as {
            documentId: string;
            scenarioId: string;
            collectionsToImport?: string[]
        };

        if (!data.scenarioId) {
            throw new Error('scenarioId is required for import action');
        }

        // Create an instance of the simulation import service
        const importService = createSimulationImportService(IMPORT_ACTION_VERBOSE_LOGGING);

        // Use the service to perform the import
        const result = await importService.importSimulationResults(action, {
            documentId: data.documentId,
            scenarioId: data.scenarioId,
            collectionsToImport: data.collectionsToImport,
            verboseLogging: IMPORT_ACTION_VERBOSE_LOGGING
        });

        if (result.success) {
            logger.info(`=== Import Simulation Results Action Completed Successfully ===`);
        } else {
            logger.error(`=== Import Simulation Results Action Completed with Errors ===`);
            if (result.error) {
                logger.error(`Error: ${result.error}`);
            }
        }

        return result;

    } catch (error) {
        logger.error(`=== Error in Import Simulation Results Action ===`);
        logger.error(`Error details:`, error);
        if (error instanceof Error) {
            logger.error(`Error name: ${error.name}`);
            logger.error(`Error message: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
        }
        return { success: false };
    }
};
