// actions/deleteScenarioAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { AzureStorageService } from "../services/azureStorageService";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";

/**
 * Action to delete a simulation scenario and all its associated files
 * @param action The asynchronous action context
 * @returns Promise resolving with success status
 */
export const deleteScenarioAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[DeleteScenarioAction]', loggingLevel);

    try {
        logger.important("=== Delete Scenario Action Started ===");

        const data = action.data as {
            documentId: string;
            scenarioId: string;
        };

        if (!data.documentId) {
            logger.error("Missing documentId");
            return {
                success: false,
                error: "documentId is required"
            };
        }

        if (!data.scenarioId) {
            logger.error("Missing scenarioId");
            return {
                success: false,
                error: "scenarioId is required"
            };
        }

        logger.info(`Deleting scenario: ${data.scenarioId} from document: ${data.documentId}`);

        const storageService = new AzureStorageService(config.azureStorageConnectionString);

        // Check if container exists
        const hasContainer = await storageService.containerExists(data.documentId);
        if (!hasContainer) {
            logger.warn(`Container ${data.documentId} does not exist`);
            return {
                success: false,
                error: "Document container not found"
            };
        }

        // List all blobs in the scenario folder
        logger.info(`Listing blobs in scenario folder: ${data.scenarioId}/`);
        const scenarioBlobs = await storageService.listBlobs(
            data.documentId,
            `${data.scenarioId}/`
        );

        if (scenarioBlobs.length === 0) {
            logger.warn(`No blobs found for scenario ${data.scenarioId}`);
            return {
                success: false,
                error: "Scenario not found"
            };
        }

        logger.info(`Found ${scenarioBlobs.length} blobs to delete`);

        // Delete each blob in the scenario folder
        let deletedCount = 0;
        const errors: string[] = [];

        for (const blobName of scenarioBlobs) {
            try {
                logger.debug(`Deleting blob: ${blobName}`);
                await storageService.deleteBlob(data.documentId, blobName);
                deletedCount++;
            } catch (blobError) {
                const errorMsg = `Failed to delete blob ${blobName}: ${blobError.message}`;
                logger.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        logger.info(`Deleted ${deletedCount} of ${scenarioBlobs.length} blobs`);

        if (errors.length > 0) {
            logger.warn(`Encountered ${errors.length} errors during deletion`);
        }

        const success = deletedCount > 0 && deletedCount === scenarioBlobs.length;

        logger.important("=== Delete Scenario Action Completed ===");

        return {
            success,
            deletedCount,
            totalBlobs: scenarioBlobs.length,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        logger.error("=== Error in Delete Scenario Action ===");
        logger.error(`Error details: ${error.message}`);
        if (error.stack) {
            logger.error(`Stack trace: ${error.stack}`);
        }

        return {
            success: false,
            error: error.message
        };
    }
};
