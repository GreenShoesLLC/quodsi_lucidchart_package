// src/functions/submitSimulationJob.ts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { BatchConfigurationError, BatchJobCreationError } from "../services/errors/batchErrors";
import { getConfig } from "../config";

interface SubmitJobRequest {
    documentId: string;
    pageId: string;
    userId: string;
    applicationId?: string;
    appVersion?: string;
}

interface ErrorResponse {
    message: string;
    details?: any;
}

interface SuccessResponse {
    message: string;
    jobId?: string;
    taskId?: string;
}

export async function submitSimulationJob(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const metrics = {
        startTime: Date.now(),
        batchServiceInitDuration: 0,
        batchSubmitDuration: 0
    };

    const requestId = context.invocationId;
    context.log(`[${requestId}] Starting submitSimulationJob`);

    try {
        // Log request headers
        context.log(`[${requestId}] Request headers:`, {
            contentType: request.headers.get('content-type'),
            contentLength: request.headers.get('content-length'),
            authorization: request.headers.has('authorization') ? 'Present' : 'Missing'
        });

        // Parse and validate request body
        context.log(`[${requestId}] Attempting to parse request body`);
        const requestBody = await request.json() as SubmitJobRequest;
        const { documentId, pageId, userId, applicationId, appVersion } = requestBody;
        
        // Log validation check results
        context.log(`[${requestId}] Request body validation:`, {
            hasDocumentId: !!documentId,
            hasPageId: !!pageId,
            hasUserId: !!userId,
            hasApplicationId: !!applicationId,
            hasAppVersion: !!appVersion,
            applicationId: applicationId || 'Using default',
            appVersion: appVersion || 'Using default'
        });
        
        if (!documentId || !pageId || !userId) {
            context.log(`[${requestId}] Error: Missing required fields in request body`, {
                missingFields: {
                    documentId: !documentId,
                    pageId: !pageId,
                    userId: !userId
                }
            });
            return {
                status: 400,
                jsonBody: { message: "Missing required fields: documentId, pageId, or userId" } as ErrorResponse
            };
        }

        // Get configuration
        const config = getConfig();

        // Validate batch service configuration
        context.log(`[${requestId}] Validating batch service configuration`);
        const batchConfigValidation = {
            hasBatchAccountUrl: !!config.batchAccountUrl,
            hasBatchAccountName: !!config.batchAccountName,
            hasBatchAccountKey: !!config.batchAccountKey,
            hasPoolId: !!config.batchPoolId,
            hasDefaultApplicationId: !!config.defaultApplicationId,
            hasDefaultAppVersion: !!config.defaultAppVersion
        };

        context.log(`[${requestId}] Batch configuration status:`, batchConfigValidation);

        // Initialize batch service
        const batchInitStart = Date.now();
        context.log(`[${requestId}] Initializing batch service`);
        
        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: config.batchAccountUrl,
            batchAccountName: config.batchAccountName,
            batchAccountKey: config.batchAccountKey,
            poolId: config.batchPoolId,
            defaultApplicationId: config.defaultApplicationId,
            defaultAppVersion: config.defaultAppVersion
        });

        metrics.batchServiceInitDuration = Date.now() - batchInitStart;
        context.log(`[${requestId}] Batch service initialized`, {
            duration: `${metrics.batchServiceInitDuration}ms`
        });

        // Submit the job
        const submitStart = Date.now();
        context.log(`[${requestId}] Submitting job to batch service`, {
            documentId,
            pageId,
            userId,
            applicationId: applicationId || 'default',
            appVersion: appVersion || 'default'
        });

        const result = await batchService.submitJob(
            documentId,
            pageId,
            userId,
            applicationId,
            appVersion
        );

        metrics.batchSubmitDuration = Date.now() - submitStart;

        // Extract jobId and taskId from result message
        const jobIdMatch = result.match(/Job '([^']+)'/);
        const taskIdMatch = result.match(/task '([^']+)'/);

        context.log(`[${requestId}] Job submission completed`, {
            submitDuration: `${metrics.batchSubmitDuration}ms`,
            jobId: jobIdMatch?.[1],
            taskId: taskIdMatch?.[1],
            result
        });

        const response: SuccessResponse = {
            message: result,
            jobId: jobIdMatch?.[1],
            taskId: taskIdMatch?.[1]
        };

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        context.log(`[${requestId}] Operation completed successfully`, {
            totalDuration: `${totalDuration}ms`,
            batchServiceInitDuration: `${metrics.batchServiceInitDuration}ms`,
            batchSubmitDuration: `${metrics.batchSubmitDuration}ms`,
            documentId,
            pageId,
            userId,
            jobId: response.jobId,
            taskId: response.taskId,
            performanceBreakdown: {
                batchServiceInit: Math.round((metrics.batchServiceInitDuration / totalDuration) * 100) + '%',
                batchSubmit: Math.round((metrics.batchSubmitDuration / totalDuration) * 100) + '%',
                other: Math.round(((totalDuration - metrics.batchServiceInitDuration - metrics.batchSubmitDuration) / totalDuration) * 100) + '%'
            }
        });

        return {
            status: 200,
            jsonBody: response
        };

    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        
        // Base error info
        const errorInfo = {
            type: error.constructor.name,
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            metrics: {
                totalDuration: `${errorDuration}ms`,
                batchServiceInitDuration: `${metrics.batchServiceInitDuration}ms`,
                batchSubmitDuration: `${metrics.batchSubmitDuration}ms`
            }
        };

        if (error instanceof BatchConfigurationError) {
            context.log(`[${requestId}] Batch configuration error after ${errorDuration}ms:`, {
                ...errorInfo,
                configurationKey: error.configurationKey,
                phase: 'batch-configuration'
            });

            return {
                status: 500,
                jsonBody: {
                    message: "Batch configuration error",
                    details: {
                        configurationKey: error.configurationKey,
                        message: error.message
                    }
                } as ErrorResponse
            };
        }

        if (error instanceof BatchJobCreationError) {
            context.log(`[${requestId}] Batch job creation error after ${errorDuration}ms:`, {
                ...errorInfo,
                jobId: error.jobId,
                batchError: error.batchError,
                phase: 'batch-job-creation'
            });

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to create batch job",
                    details: {
                        jobId: error.jobId,
                        batchError: error.batchError,
                        message: error.message
                    }
                } as ErrorResponse
            };
        }

        context.log(`[${requestId}] Unexpected error after ${errorDuration}ms:`, {
            ...errorInfo,
            phase: 'unknown'
        });

        return {
            status: 500,
            jsonBody: {
                message: "Unexpected error: " + (error instanceof Error ? error.message : "Unknown error")
            } as ErrorResponse
        };
    }
}

app.http("submitSimulationJob", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "simulation/submit",
    handler: submitSimulationJob
});