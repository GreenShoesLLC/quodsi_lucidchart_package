// actions/getTaskStatusAction.ts
import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from '../services/azureStorageService';
import { LucidSimulationJobSubmissionService } from '../services/lucidSimulationJobSubmissionService';
import { getConfig } from '../config';
import { ActionLogger } from '../utils/logging';
import { LoggingLevel } from '../utils/loggingLevels';

interface GetTaskStatusRequest {
    jobId: string;
    taskId: string;
    documentId: string;
    scenarioId: string;
    scenarioName: string;
}

interface TaskStatusResult {
    success: boolean;
    state: string;
    failed: boolean;
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

    // Task ended with non-zero exit code
    if (exitCode !== undefined && exitCode !== 0) {
        return {
            message: 'Simulation failed to start',
            errorType: 'TASK_CRASH_ERROR',
            suggestions: [
                'The simulation crashed during startup',
                'Contact support if this persists'
            ]
        };
    }

    // Generic failure
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
 * Writes task failure information to status.json
 */
async function writeTaskFailureToStatus(
    storageService: AzureStorageService,
    documentId: string,
    scenarioId: string,
    scenarioName: string,
    failureDetails: { message: string; errorType: string; suggestions: string[] },
    taskState: { state: string; failureInfo?: any; executionInfo?: any }
): Promise<void> {
    const errorStatus = JSON.stringify({
        id: scenarioId,
        name: scenarioName,
        runState: 'RAN_WITH_ERRORS',
        error: failureDetails.message,
        errorType: failureDetails.errorType,
        errorDetails: taskState.failureInfo?.message ||
            (taskState.executionInfo?.exitCode !== undefined
                ? `Task exited with code ${taskState.executionInfo.exitCode}`
                : 'Task failed without details'),
        errorSuggestions: failureDetails.suggestions,
        lastUpdated: new Date().toISOString()
    }, null, 2);

    await storageService.uploadBlobContent(documentId, `${scenarioId}/status.json`, errorStatus);
}

export const getTaskStatusAction = async (
    action: DataConnectorAsynchronousAction
): Promise<TaskStatusResult> => {
    const config = getConfig();
    const loggingLevel = config.logging?.hardRefreshActionLoggingLevel || LoggingLevel.NORMAL;
    const logger = new ActionLogger('[GetTaskStatusAction]', loggingLevel);

    try {
        logger.important('Starting task status check');

        const data = action.data as GetTaskStatusRequest;
        const { jobId, taskId, documentId, scenarioId, scenarioName } = data;

        if (!jobId || !taskId || !documentId || !scenarioId || !scenarioName) {
            logger.error('Missing required fields');
            return {
                success: false,
                state: 'error',
                failed: true,
                error: 'Missing required fields'
            };
        }

        logger.info(`Checking task status: jobId=${jobId}, taskId=${taskId}`);

        // Initialize batch service
        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: config.batchAccountUrl,
            batchAccountName: config.batchAccountName,
            batchAccountKey: config.batchAccountKey,
            poolId: config.batchPoolId,
            defaultApplicationId: config.defaultApplicationId,
            defaultAppVersion: config.defaultAppVersion
        });

        // Get task state from Azure Batch
        const taskState = await batchService.getTaskState(jobId, taskId);

        logger.info(`Task state retrieved: state=${taskState.state}, hasFailure=${!!taskState.failureInfo}`);

        // Determine if task failed
        const hasFailed = taskState.failureInfo !== undefined ||
            taskState.state === 'not_found' ||
            (taskState.state === 'completed' && taskState.executionInfo?.exitCode !== 0);

        // If task failed, write error to status.json
        if (hasFailed) {
            logger.warn('Task failure detected, updating status.json');

            const failureDetails = getTaskFailureDetails(
                taskState.failureInfo?.category,
                taskState.failureInfo?.code,
                taskState.executionInfo?.exitCode
            );

            const storageService = new AzureStorageService(config.azureStorageConnectionString);
            await writeTaskFailureToStatus(
                storageService,
                documentId,
                scenarioId,
                scenarioName,
                failureDetails,
                taskState
            );

            logger.important('Task failure written to status.json');

            return {
                success: true,
                state: taskState.state,
                failed: true,
                error: failureDetails.message,
                errorType: failureDetails.errorType,
                errorSuggestions: failureDetails.suggestions
            };
        }

        logger.important('Task status check completed - task is running normally');

        return {
            success: true,
            state: taskState.state,
            failed: false
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error checking task status: ${errorMessage}`);

        return {
            success: false,
            state: 'error',
            failed: true,
            error: `Failed to check task status: ${errorMessage}`
        };
    }
};
