// actions/checkSimulationRunTaskStatusAction.ts
import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from '../services/azureStorageService';
import { LucidSimulationJobSubmissionService } from '../services/lucidSimulationJobSubmissionService';
import { getConfig } from '../config';
import { ActionLogger } from '../utils/logging';
import { LoggingLevel } from '../utils/loggingLevels';

interface CheckSimulationRunTaskStatusRequest {
    documentId: string;
    scenarioId: string;
}

interface CheckSimulationRunTaskStatusResult {
    success: boolean;
    state: string;
    failed: boolean;
    scenarioName?: string;
    error?: string;
    errorType?: string;
    errorSuggestions?: string[];
}

/**
 * User-friendly error messages based on Azure Batch failure categories
 */
function getTaskFailureDetails(failureCategory?: string, failureCode?: string, exitCode?: number): {
    message: string;
    errorType: string;
    suggestions: string[];
} {
    if (failureCategory === 'SchedulingError') {
        return {
            message: 'Simulation could not be scheduled',
            errorType: 'SCHEDULING_ERROR',
            suggestions: [
                'Compute resources may be fully utilized',
                'Try again in a few minutes'
            ]
        };
    }

    if (failureCategory === 'ApplicationPackageError') {
        return {
            message: 'Simulation environment is not properly configured',
            errorType: 'APPLICATION_PACKAGE_ERROR',
            suggestions: [
                'The simulation software is not installed on the compute pool',
                'Contact your administrator to verify the compute configuration'
            ]
        };
    }

    if (failureCategory === 'StartTaskFailed') {
        return {
            message: 'Compute environment failed to initialize',
            errorType: 'START_TASK_ERROR',
            suggestions: [
                'This is typically a temporary issue',
                'Try again in a few minutes'
            ]
        };
    }

    // Handle specific Python exit codes
    if (exitCode !== undefined && exitCode !== 0) {
        if (exitCode === 6) {
            return {
                message: 'Failed to save simulation results',
                errorType: 'STORAGE_ERROR',
                suggestions: [
                    'Storage service may be temporarily unavailable',
                    'Try running the simulation again'
                ]
            };
        }

        if (exitCode === 1) {
            return {
                message: 'Model validation failed',
                errorType: 'VALIDATION_ERROR',
                suggestions: [
                    'Check your model configuration for errors'
                ]
            };
        }

        return {
            message: 'Simulation failed to complete',
            errorType: 'TASK_CRASH_ERROR',
            suggestions: [
                `Task exited with code ${exitCode}`,
                'Try running the simulation again'
            ]
        };
    }

    return {
        message: 'Simulation task failed',
        errorType: 'TASK_FAILURE',
        suggestions: [
            'An unexpected error occurred',
            'Try running the simulation again'
        ]
    };
}

/**
 * Checks the Batch task status for a scenario by reading jobId/taskId from status.json
 * This is used for early failure detection (30s after submission)
 */
export const checkSimulationRunTaskStatusAction = async (
    action: DataConnectorAsynchronousAction
): Promise<CheckSimulationRunTaskStatusResult> => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[CheckSimulationRunTaskStatusAction]', loggingLevel);

    try {
        logger.important('Starting simulation run task status check');

        const data = action.data as CheckSimulationRunTaskStatusRequest;
        const { documentId, scenarioId } = data;

        if (!documentId || !scenarioId) {
            logger.error('Missing required fields');
            return {
                success: false,
                state: 'error',
                failed: true,
                error: 'Missing documentId or scenarioId'
            };
        }

        logger.info(`Checking task status for scenario: documentId=${documentId}, scenarioId=${scenarioId}`);

        // Read status.json to get jobId/taskId
        const storageService = new AzureStorageService(config.azureStorageConnectionString);
        const statusJsonPath = `${scenarioId}/status.json`;
        const statusJson = await storageService.getBlobContent(documentId, statusJsonPath);

        if (!statusJson) {
            logger.warn('No status.json found for scenario');
            return {
                success: true,
                state: 'not_found',
                failed: false
            };
        }

        let statusData: any;
        try {
            statusData = JSON.parse(statusJson);
        } catch (parseError) {
            logger.error('Failed to parse status.json');
            return {
                success: false,
                state: 'error',
                failed: true,
                error: 'Failed to parse status.json'
            };
        }

        const { jobId, taskId, name: scenarioName } = statusData;

        if (!jobId || !taskId) {
            logger.info('No jobId/taskId in status.json yet - task may not have been submitted');
            return {
                success: true,
                state: 'pending',
                failed: false,
                scenarioName
            };
        }

        logger.info(`Found batch identifiers: jobId=${jobId}, taskId=${taskId}`);

        // Initialize batch service and check task status
        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: config.batchAccountUrl,
            batchAccountName: config.batchAccountName,
            batchAccountKey: config.batchAccountKey,
            poolId: config.batchPoolId,
            defaultApplicationId: config.defaultApplicationId,
            defaultAppVersion: config.defaultAppVersion
        });

        const taskState = await batchService.getTaskState(jobId, taskId);
        logger.info(`Task state: state=${taskState.state}, hasFailure=${!!taskState.failureInfo}`);

        // Determine if task failed
        const hasFailed = taskState.failureInfo !== undefined ||
            taskState.state === 'not_found' ||
            (taskState.state === 'completed' && taskState.executionInfo?.exitCode !== 0);

        if (hasFailed) {
            logger.warn('Task failure detected, updating status.json');

            const failureDetails = getTaskFailureDetails(
                taskState.failureInfo?.category,
                taskState.failureInfo?.code,
                taskState.executionInfo?.exitCode
            );

            // Write failure to status.json
            const errorStatus = JSON.stringify({
                id: scenarioId,
                name: scenarioName || scenarioId,
                runState: 'RAN_WITH_ERRORS',
                error: failureDetails.message,
                errorType: failureDetails.errorType,
                errorDetails: taskState.failureInfo?.message ||
                    (taskState.executionInfo?.exitCode !== undefined
                        ? `Task exited with code ${taskState.executionInfo.exitCode}`
                        : 'Task failed without details'),
                errorSuggestions: failureDetails.suggestions,
                jobId,
                taskId,
                lastUpdated: new Date().toISOString()
            }, null, 2);

            await storageService.uploadBlobContent(documentId, statusJsonPath, errorStatus);
            logger.important('Task failure written to status.json');

            return {
                success: true,
                state: taskState.state,
                failed: true,
                scenarioName,
                error: failureDetails.message,
                errorType: failureDetails.errorType,
                errorSuggestions: failureDetails.suggestions
            };
        }

        logger.important('Task status check completed - task is running normally');

        return {
            success: true,
            state: taskState.state,
            failed: false,
            scenarioName
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error checking simulation run task status: ${errorMessage}`);

        return {
            success: false,
            state: 'error',
            failed: true,
            error: `Failed to check task status: ${errorMessage}`
        };
    }
};
