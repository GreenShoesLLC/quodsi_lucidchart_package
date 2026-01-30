// actions/listScenariosAction.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { getConfig } from "../config";
import { AzureStorageService } from "../services/azureStorageService";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { StorageError } from "../services/errors/storageErrors";
import { RunState } from "../types/documentStatus";
import { ScenarioInfo, ScenarioDownloadInfo } from "../types/scenarios";
import { ActionLogger } from "../utils/logging";
import { LoggingLevel } from "../utils/loggingLevels";

/**
 * Maps Python exit codes to user-friendly error information.
 * Used when backfilling status.json from Batch task state.
 */
function getExitCodeErrorInfo(exitCode: number): {
    error: string;
    errorType: string;
    errorSuggestions: string[];
} {
    switch (exitCode) {
        case 1:
            return {
                error: 'Model validation failed',
                errorType: 'VALIDATION_ERROR',
                errorSuggestions: [
                    'Check your model configuration for errors',
                    'Review the validation messages in the editor'
                ]
            };
        case 4:
            return {
                error: 'Simulation execution failed',
                errorType: 'SIMULATION_ERROR',
                errorSuggestions: [
                    'The simulation encountered an error during execution',
                    'Check model parameters for potential issues'
                ]
            };
        case 5:
            return {
                error: 'Simulation configuration error',
                errorType: 'CONFIGURATION_ERROR',
                errorSuggestions: [
                    'There is an issue with the simulation configuration',
                    'Contact support if this persists'
                ]
            };
        case 6:
            return {
                error: 'Failed to save simulation results',
                errorType: 'STORAGE_ERROR',
                errorSuggestions: [
                    'Storage service may be temporarily unavailable',
                    'Your simulation completed but results could not be saved',
                    'Try running the simulation again'
                ]
            };
        default:
            return {
                error: `Simulation failed (exit code ${exitCode})`,
                errorType: 'TASK_FAILURE',
                errorSuggestions: [
                    'An unexpected error occurred',
                    'Try running the simulation again'
                ]
            };
    }
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

                // ALWAYS read model.json first for configuration values
                const modelJsonPath = `${scenarioId}/model.json`;
                const modelJson = await storageService.getBlobContent(
                    data.documentId,
                    modelJsonPath
                );

                if (!modelJson) {
                    logger.warn(`No model.json found for scenario ${scenarioId}, skipping`);
                    continue;
                }

                // Parse model.json to get configuration values
                let modelData: any = null;
                try {
                    modelData = JSON.parse(modelJson);
                } catch (parseError) {
                    logger.error(`Failed to parse model.json for scenario ${scenarioId}: ${parseError.message}`);
                    continue;
                }

                // Build scenario info from model.json (configuration values)
                let statusData: any = {
                    id: scenarioId,
                    name: scenarioId, // Use scenarioId (contains datetime from Azure Function)
                    runState: RunState.NotRun,
                    reps: modelData.model?.reps || 0,
                    runClockPeriod: modelData.model?.runClockPeriod || 0,
                    runClockPeriodUnit: modelData.model?.runClockPeriodUnit || 'Minutes',
                    simulationTimeType: modelData.model?.simulationTimeType || 'Clock'
                };

                // Optionally read status.json for runtime state (runState, completedAt)
                const statusJsonPath = `${scenarioId}/status.json`;
                const statusJson = await storageService.getBlobContent(
                    data.documentId,
                    statusJsonPath
                );

                if (statusJson) {
                    try {
                        const runtimeData = JSON.parse(statusJson);

                        // Merge runtime state from status.json (override NotRun if status exists)
                        statusData.runState = runtimeData.runState || statusData.runState;
                        statusData.completedAt = runtimeData.completedAt || runtimeData.lastUpdated;

                        // Use status.json name if available (might be more user-friendly)
                        if (runtimeData.name) {
                            statusData.name = runtimeData.name;
                        }

                        // Extract progress tracking fields
                        if (runtimeData.currentReplication !== undefined) {
                            statusData.currentReplication = runtimeData.currentReplication;
                        }

                        // Extract error fields (populated by Python runner when simulation fails)
                        if (runtimeData.error) {
                            statusData.error = runtimeData.error;
                        }
                        if (runtimeData.errorType) {
                            statusData.errorType = runtimeData.errorType;
                        }
                        if (runtimeData.errorDetails) {
                            statusData.errorDetails = runtimeData.errorDetails;
                        }
                        if (runtimeData.errorSuggestions) {
                            statusData.errorSuggestions = runtimeData.errorSuggestions;
                        }

                        // Extract timing fields (populated by Python runner)
                        if (runtimeData.start_time) {
                            statusData.startTime = runtimeData.start_time;
                        }
                        if (runtimeData.end_time) {
                            statusData.endTime = runtimeData.end_time;
                        }
                        if (runtimeData.metrics) {
                            statusData.metrics = runtimeData.metrics;
                        }

                        // Extract Batch job identifiers (used to query task state for stale scenarios)
                        if (runtimeData.jobId) {
                            statusData.jobId = runtimeData.jobId;
                        }
                        if (runtimeData.taskId) {
                            statusData.taskId = runtimeData.taskId;
                        }

                        logger.debug(`Merged status.json for scenario ${scenarioId}: runState=${statusData.runState}, hasError=${!!statusData.error}, hasJobId=${!!statusData.jobId}`);
                    } catch (parseError) {
                        logger.error(`Failed to parse status.json for scenario ${scenarioId}: ${parseError.message}`);
                        // Continue with model.json data only
                    }
                } else {
                    logger.debug(`No status.json for scenario ${scenarioId}, using model.json only`);
                }

                // Find any .zip file in the scenario folder
                const scenarioZipBlobs = allBlobs.filter(blobName =>
                    blobName.startsWith(`${scenarioId}/`) && blobName.endsWith('.zip')
                );

                // Find Excel file in the scenario folder (standalone, not inside ZIP)
                const scenarioExcelBlobs = allBlobs.filter(blobName =>
                    blobName.startsWith(`${scenarioId}/`) && (blobName.endsWith('.xlsx') || blobName.endsWith('.xls'))
                );

                const hasResults = scenarioZipBlobs.length > 0;
                const resultsZipPath = hasResults ? scenarioZipBlobs[0] : null;
                const resultsExcelPath = scenarioExcelBlobs.length > 0 ? scenarioExcelBlobs[0] : null;

                logger.debug(`Scenario ${scenarioId}: hasResults=${hasResults}, zipFile=${resultsZipPath}, excelFile=${resultsExcelPath}, runState=${statusData.runState}`);

                // Enhanced timeout detection: Check if scenario has been RUNNING for too long
                // and distinguish between different failure modes
                if (statusData.runState === RunState.Running) {
                    const lastUpdate = new Date(statusData.completedAt || statusData.lastUpdated || Date.now());
                    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

                    if (hoursSinceUpdate > 1) {
                        logger.warn(`Scenario ${scenarioId} stale: running for ${hoursSinceUpdate.toFixed(1)} hours`);

                        // First, try to get actual task state from Batch API if we have jobId/taskId
                        // This handles cases where Python couldn't write to status.json (e.g., storage failures)
                        let batchTaskChecked = false;
                        if (statusData.jobId && statusData.taskId) {
                            try {
                                logger.info(`Checking Batch task state for scenario ${scenarioId}: jobId=${statusData.jobId}, taskId=${statusData.taskId}`);

                                const batchService = new LucidSimulationJobSubmissionService({
                                    batchAccountUrl: config.batchAccountUrl,
                                    batchAccountName: config.batchAccountName,
                                    batchAccountKey: config.batchAccountKey,
                                    poolId: config.batchPoolId,
                                    defaultApplicationId: config.defaultApplicationId,
                                    defaultAppVersion: config.defaultAppVersion
                                });

                                const taskState = await batchService.getTaskState(statusData.jobId, statusData.taskId);
                                logger.info(`Batch task state for scenario ${scenarioId}: state=${taskState.state}, exitCode=${taskState.executionInfo?.exitCode}`);

                                if (taskState.state === 'completed') {
                                    batchTaskChecked = true;
                                    const exitCode = taskState.executionInfo?.exitCode;

                                    if (exitCode !== undefined && exitCode !== 0) {
                                        // Task failed with non-zero exit code - use exit code mapping
                                        const errorInfo = getExitCodeErrorInfo(exitCode);
                                        statusData.runState = RunState.RanWithErrors;
                                        statusData.error = errorInfo.error;
                                        statusData.errorType = errorInfo.errorType;
                                        statusData.errorSuggestions = errorInfo.errorSuggestions;
                                        statusData.errorDetails = taskState.failureInfo?.message ||
                                            `Task exited with code ${exitCode}`;

                                        logger.warn(`Scenario ${scenarioId} failed with exit code ${exitCode}: ${errorInfo.error}`);

                                        // Backfill status.json so future polls see the error without Batch API call
                                        try {
                                            const backfilledStatus = JSON.stringify({
                                                id: scenarioId,
                                                name: statusData.name,
                                                runState: 'RAN_WITH_ERRORS',
                                                error: statusData.error,
                                                errorType: statusData.errorType,
                                                errorDetails: statusData.errorDetails,
                                                errorSuggestions: statusData.errorSuggestions,
                                                jobId: statusData.jobId,
                                                taskId: statusData.taskId,
                                                lastUpdated: new Date().toISOString(),
                                                backfilledFromBatch: true
                                            }, null, 2);

                                            await storageService.uploadBlobContent(
                                                data.documentId,
                                                `${scenarioId}/status.json`,
                                                backfilledStatus
                                            );
                                            logger.info(`Backfilled status.json for scenario ${scenarioId} with Batch task failure info`);
                                        } catch (backfillError: any) {
                                            logger.warn(`Failed to backfill status.json for scenario ${scenarioId}: ${backfillError.message}`);
                                            // Continue - we still have the error info in memory
                                        }
                                    } else if (exitCode === 0) {
                                        // Task completed successfully but status.json wasn't updated
                                        // This is unusual - Python should have written RAN_SUCCESSFULLY
                                        logger.warn(`Scenario ${scenarioId} task completed (exit 0) but status.json shows RUNNING`);
                                        // Keep as RUNNING - let user re-run if needed
                                    }
                                } else if (taskState.state === 'not_found') {
                                    // Job/task was cleaned up - fall through to heuristic detection
                                    logger.info(`Batch task not found for scenario ${scenarioId}, using timeout heuristics`);
                                }
                                // If task is still active/preparing/running, don't change status
                            } catch (batchError: any) {
                                logger.warn(`Could not check Batch task state for scenario ${scenarioId}: ${batchError.message}`);
                                // Fall through to heuristic-based timeout detection
                            }
                        }

                        // Fall back to heuristic-based timeout detection if Batch check didn't resolve it
                        if (!batchTaskChecked && statusData.runState === RunState.Running) {
                            logger.warn(`Scenario ${scenarioId} timed out (no Batch info): running for ${hoursSinceUpdate.toFixed(1)} hours`);
                            statusData.runState = RunState.RanWithErrors;

                            // Distinguish failure modes based on available status data
                            const hasStartTime = !!statusData.startTime;
                            const hasProgress = (statusData.currentReplication || 0) > 0;
                            const reps = statusData.reps || modelData.model?.reps || 0;

                            if (!hasStartTime) {
                                // Never started - task was submitted but never began executing
                                statusData.error = 'Simulation failed to start';
                                statusData.errorType = 'STARTUP_ERROR';
                                statusData.errorSuggestions = [
                                    'The simulation was submitted but never began executing',
                                    'Compute resources may have been unavailable',
                                    'Try running the simulation again'
                                ];
                                statusData.errorDetails = `No status update for ${hoursSinceUpdate.toFixed(1)} hours. Task never started.`;
                            } else if (!hasProgress) {
                                // Started but crashed before first replication
                                statusData.error = 'Simulation crashed during initialization';
                                statusData.errorType = 'INITIALIZATION_ERROR';
                                statusData.errorSuggestions = [
                                    'The simulation started but crashed before completing any replications',
                                    'There may be an issue with the model configuration',
                                    'Contact support if this persists'
                                ];
                                statusData.errorDetails = `Task started but no replications completed in ${hoursSinceUpdate.toFixed(1)} hours.`;
                            } else {
                                // Had progress then stopped
                                statusData.error = `Simulation stopped responding after ${statusData.currentReplication} replications`;
                                statusData.errorType = 'TIMEOUT_ERROR';
                                statusData.errorSuggestions = [
                                    `Completed ${statusData.currentReplication} of ${reps} replications before stopping`,
                                    'The simulation may have encountered an unexpected condition',
                                    'Try running with fewer replications to identify the issue'
                                ];
                                statusData.errorDetails = `Task stopped after ${statusData.currentReplication} of ${reps} replications. No update for ${hoursSinceUpdate.toFixed(1)} hours.`;
                            }
                        }
                    }
                }

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
                    hasResults,
                    // Progress tracking
                    currentReplication: statusData.currentReplication,
                    // Error fields
                    error: statusData.error,
                    errorType: statusData.errorType,
                    errorDetails: statusData.errorDetails,
                    errorSuggestions: statusData.errorSuggestions,
                    // Timing fields
                    startTime: statusData.startTime,
                    endTime: statusData.endTime,
                    metrics: statusData.metrics
                };

                // Generate SAS URLs only if results exist and status is successful
                if (hasResults && resultsZipPath && statusData.runState === RunState.RanSuccessfully) {
                    try {
                        // Get ZIP blob metadata
                        const zipMetadata = await storageService.getBlobMetadata(
                            data.documentId,
                            resultsZipPath
                        );

                        // Generate ZIP SAS URL with 30-minute expiry
                        const zipSasUrl = await storageService.generateBlobSasUrl(
                            data.documentId,
                            resultsZipPath,
                            30
                        );

                        // Calculate expiry time
                        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

                        // Initialize download info with ZIP
                        scenarioInfo.downloadInfo = {
                            zipUrl: zipSasUrl,
                            excelUrl: '', // Will be populated below if Excel file exists
                            fileSizeBytes: zipMetadata.sizeBytes,
                            fileSizeMB: formatBytes(zipMetadata.sizeBytes),
                            expiresAt
                        };

                        logger.info(`Generated ZIP SAS URL for scenario ${scenarioId} (${resultsZipPath}), expires at ${expiresAt}`);

                        // Generate Excel SAS URL if Excel file exists
                        if (resultsExcelPath) {
                            try {
                                const excelSasUrl = await storageService.generateBlobSasUrl(
                                    data.documentId,
                                    resultsExcelPath,
                                    30
                                );
                                scenarioInfo.downloadInfo.excelUrl = excelSasUrl;
                                logger.info(`Generated Excel SAS URL for scenario ${scenarioId} (${resultsExcelPath})`);
                            } catch (excelSasError) {
                                logger.error(`Failed to generate Excel SAS URL for scenario ${scenarioId}: ${excelSasError.message}`);
                                // Continue with ZIP URL only
                            }
                        } else {
                            logger.warn(`No Excel file found for scenario ${scenarioId}, excelUrl will be empty`);
                        }
                    } catch (sasError) {
                        logger.error(`Failed to generate SAS URLs for scenario ${scenarioId}: ${sasError.message}`);
                        // Continue without download info
                    }
                }

                scenarios.push(scenarioInfo);
                logger.debug(`Added scenario ${scenarioId} to results`);

            } catch (scenarioError: any) {
                // Handle storage errors with user-friendly messages
                if (scenarioError instanceof StorageError) {
                    logger.error(`Storage error processing scenario ${scenarioId}: ${scenarioError.message}`, {
                        errorType: scenarioError.errorType,
                        details: scenarioError.details
                    });

                    // Return scenario with storage error info so UI can display it
                    scenarios.push({
                        id: scenarioId,
                        name: scenarioId,
                        runState: RunState.RanWithErrors,
                        reps: 0,
                        runClockPeriod: 0,
                        runClockPeriodUnit: 'Minutes',
                        simulationTimeType: 'Clock',
                        hasResults: false,
                        error: scenarioError.message,
                        errorType: scenarioError.errorType,
                        errorSuggestions: scenarioError.suggestions
                    });
                    continue;
                }

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
