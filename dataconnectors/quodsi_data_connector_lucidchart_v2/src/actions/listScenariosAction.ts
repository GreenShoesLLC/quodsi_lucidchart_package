// actions/listScenariosAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { AzureStorageService } from "../services/azureStorageService";
import { RunState } from "../types/documentStatus";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";

interface ScenarioDownloadInfo {
    zipUrl: string;
    fileSizeBytes: number;
    fileSizeMB: string;
    expiresAt: string;
}

interface ScenarioInfo {
    id: string;
    name: string;
    runState: RunState;
    reps: number;
    runClockPeriod: number;
    runClockPeriodUnit: string;
    simulationTimeType: string;
    completedAt?: string;
    hasResults: boolean;
    downloadInfo?: ScenarioDownloadInfo;
}

/**
 * Helper function to format bytes to MB
 */
function formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

/**
 * Helper function to extract unique scenario folder names from blob list
 */
function extractScenarioIds(blobNames: string[]): string[] {
    const scenarioIds = new Set<string>();

    for (const blobName of blobNames) {
        // Extract the first part of the path (scenario folder name)
        const parts = blobName.split('/');
        if (parts.length > 1) {
            scenarioIds.add(parts[0]);
        }
    }

    return Array.from(scenarioIds);
}

export const listScenariosAction = async (
    action: DataConnectorAsynchronousAction
) => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[ListScenariosAction]', loggingLevel);

    try {
        logger.important("=== List Scenarios Action Started ===");

        const data = action.data as { documentId: string };

        if (!data.documentId) {
            logger.error("Missing documentId");
            return {
                success: false,
                error: "documentId is required"
            };
        }

        const storageService = new AzureStorageService(config.azureStorageConnectionString);

        // Check if container exists
        const hasContainer = await storageService.containerExists(data.documentId);

        if (!hasContainer) {
            logger.info(`Container ${data.documentId} does not exist, returning empty scenario list`);
            return {
                success: true,
                documentId: data.documentId,
                scenarios: [],
                generatedAt: new Date().toISOString()
            };
        }

        // List all blobs in container
        logger.info(`Listing all blobs in container: ${data.documentId}`);
        const allBlobs = await storageService.listBlobs(data.documentId);
        logger.info(`Found ${allBlobs.length} blobs in container`);

        // Extract unique scenario folder names
        const scenarioIds = extractScenarioIds(allBlobs);
        logger.info(`Found ${scenarioIds.length} scenario folders: ${scenarioIds.join(', ')}`);

        // Process each scenario
        const scenarios: ScenarioInfo[] = [];

        for (const scenarioId of scenarioIds) {
            try {
                logger.debug(`Processing scenario: ${scenarioId}`);

                // Read status.json from scenario folder
                const statusJsonPath = `${scenarioId}/status.json`;
                const statusJson = await storageService.getBlobContent(
                    data.documentId,
                    statusJsonPath
                );

                if (!statusJson) {
                    logger.warn(`No status.json found for scenario ${scenarioId}, skipping`);
                    continue;
                }

                // Parse status.json
                let statusData: any;
                try {
                    statusData = JSON.parse(statusJson);
                } catch (parseError) {
                    logger.error(`Failed to parse status.json for scenario ${scenarioId}: ${parseError.message}`);
                    continue;
                }

                // Find any .zip file in the scenario folder
                const scenarioZipBlobs = allBlobs.filter(blobName =>
                    blobName.startsWith(`${scenarioId}/`) && blobName.endsWith('.zip')
                );

                const hasResults = scenarioZipBlobs.length > 0;
                const resultsZipPath = hasResults ? scenarioZipBlobs[0] : null;

                logger.debug(`Scenario ${scenarioId}: hasResults=${hasResults}, zipFile=${resultsZipPath}, runState=${statusData.runState}`);

                // Build scenario info
                const scenarioInfo: ScenarioInfo = {
                    id: statusData.id || scenarioId,
                    name: statusData.name || 'Unnamed Scenario',
                    runState: statusData.runState as RunState || RunState.NotRun,
                    reps: statusData.reps || 0,
                    runClockPeriod: statusData.runClockPeriod || 0,
                    runClockPeriodUnit: statusData.runClockPeriodUnit || 'Minutes',
                    simulationTimeType: statusData.simulationTimeType || 'Clock',
                    completedAt: statusData.completedAt || statusData.lastUpdated,
                    hasResults
                };

                // Generate SAS URL only if results exist and status is successful
                if (hasResults && resultsZipPath && statusData.runState === RunState.RanSuccessfully) {
                    try {
                        // Get blob metadata
                        const metadata = await storageService.getBlobMetadata(
                            data.documentId,
                            resultsZipPath
                        );

                        // Generate SAS URL with 30-minute expiry
                        const sasUrl = await storageService.generateBlobSasUrl(
                            data.documentId,
                            resultsZipPath,
                            30
                        );

                        // Calculate expiry time
                        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

                        scenarioInfo.downloadInfo = {
                            zipUrl: sasUrl,
                            fileSizeBytes: metadata.sizeBytes,
                            fileSizeMB: formatBytes(metadata.sizeBytes),
                            expiresAt
                        };

                        logger.info(`Generated SAS URL for scenario ${scenarioId} (${resultsZipPath}), expires at ${expiresAt}`);
                    } catch (sasError) {
                        logger.error(`Failed to generate SAS URL for scenario ${scenarioId}: ${sasError.message}`);
                        // Continue without download info
                    }
                }

                scenarios.push(scenarioInfo);
                logger.debug(`Added scenario ${scenarioId} to results`);

            } catch (scenarioError) {
                logger.error(`Error processing scenario ${scenarioId}: ${scenarioError.message}`);
                // Continue with next scenario
            }
        }

        // Sort scenarios by completedAt (most recent first)
        scenarios.sort((a, b) => {
            if (!a.completedAt) return 1;
            if (!b.completedAt) return -1;
            return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        });

        logger.important(`=== List Scenarios Action Completed Successfully ===`);
        logger.info(`Returning ${scenarios.length} scenarios`);

        return {
            success: true,
            documentId: data.documentId,
            scenarios,
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        logger.error(`=== Error in List Scenarios Action ===`);
        logger.error(`Error details: ${error.message}`);
        if (error.stack) {
            logger.error(`Stack trace: ${error.stack}`);
        }

        return {
            success: false,
            error: error.message,
            documentId: (action.data as any)?.documentId,
            scenarios: [],
            generatedAt: new Date().toISOString()
        };
    }
};
