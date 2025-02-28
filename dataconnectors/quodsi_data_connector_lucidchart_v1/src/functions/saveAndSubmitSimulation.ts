// src/functions/saveAndSubmitSimulation.ts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { AzureStorageService } from "../services/azureStorageService";
import { LucidSimulationJobSubmissionService } from "../services/lucidSimulationJobSubmissionService";
import { BatchConfigurationError, BatchJobCreationError } from "../services/errors/batchErrors";

interface SaveAndSubmitRequest {
    documentId: string;
    pageId: string;
    userId: string;
    model: any;  // The model definition
    applicationId?: string;
    appVersion?: string;
}

interface ErrorResponse {
    message: string;
    details?: any;
    phase?: string;
}

interface SuccessResponse {
    blobUrl: string;
    uploadDateTime: string;
    batchJob: {
        message: string;
        jobId?: string;
        taskId?: string;
    }
}

export async function saveAndSubmitSimulation(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const metrics = {
        startTime: Date.now(),
        uploadDuration: 0,
        batchSubmitDuration: 0,
        modelSize: 0,
        compressionRatio: 0,
        modelSerializationDuration: 0
    };

    const requestId = context.invocationId;
    context.log(`[${requestId}] Starting saveAndSubmitSimulation`);

    try {
        // Log request headers
        context.log(`[${requestId}] Request headers:`, {
            contentType: request.headers.get('content-type'),
            contentLength: request.headers.get('content-length'),
            authorization: request.headers.has('authorization') ? 'Present' : 'Missing'
        });

        // Parse and validate request body
        context.log(`[${requestId}] Attempting to parse request body`);
        const requestBody = await request.json() as SaveAndSubmitRequest;
        const { documentId, pageId, userId, model, applicationId, appVersion } = requestBody;
        
        // Log validation check results
        context.log(`[${requestId}] Request body validation:`, {
            hasDocumentId: !!documentId,
            hasPageId: !!pageId,
            hasUserId: !!userId,
            hasModel: !!model,
            modelType: model ? typeof model : 'undefined',
            modelKeys: model ? Object.keys(model) : [],
            hasApplicationId: !!applicationId,
            hasAppVersion: !!appVersion
        });
        
        if (!documentId || !pageId || !userId || !model) {
            context.log(`[${requestId}] Error: Missing required fields in request body`, {
                missingFields: {
                    documentId: !documentId,
                    pageId: !pageId,
                    userId: !userId,
                    model: !model
                }
            });
            return {
                status: 400,
                jsonBody: { 
                    message: "Missing required fields: documentId, pageId, userId, or model",
                    phase: "validation"
                } as ErrorResponse
            };
        }

        // Phase 1: Upload model to blob storage
        context.log(`[${requestId}] Starting Phase 1: Upload model to blob storage`);
        const uploadStart = Date.now();

        // Initialize storage service
        const storageService = new AzureStorageService(process.env.AzureStorageConnectionString!);
        context.log(`[${requestId}] Storage service initialized`);
        
        const blobName = "model_" + userId + "_" + pageId + ".json";

        // Serialize model
        const serializeStart = Date.now();
        const modelJson = JSON.stringify(model, null, 2);
        metrics.modelSerializationDuration = Date.now() - serializeStart;
        metrics.modelSize = modelJson.length;
        
        // Calculate compression ratio
        const originalSize = JSON.stringify(model).length;
        metrics.compressionRatio = originalSize ? (modelJson.length / originalSize) : 1;

        context.log(`[${requestId}] Model serialization completed`, {
            serializationDuration: `${metrics.modelSerializationDuration}ms`,
            modelSize: metrics.modelSize,
            compressionRatio: metrics.compressionRatio
        });
        
        context.log(`[${requestId}] Starting blob upload`, {
            blobName,
            containerName: documentId,
            contentLength: modelJson.length
        });

        const uploadSuccess = await storageService.uploadBlobContent(
            documentId,  // Using documentId as container name
            blobName,
            modelJson
        );
        
        metrics.uploadDuration = Date.now() - uploadStart;

        context.log(`[${requestId}] Blob upload completed`, {
            success: uploadSuccess,
            uploadDuration: `${metrics.uploadDuration}ms`
        });

        if (!uploadSuccess) {
            context.log(`[${requestId}] Error: Failed to upload blob`, {
                blobName,
                containerName: documentId
            });
            return {
                status: 500,
                jsonBody: { 
                    message: "Failed to upload model definition",
                    phase: "upload"
                } as ErrorResponse
            };
        }

        // Phase 2: Submit batch job
        context.log(`[${requestId}] Starting Phase 2: Submit batch job`);
        const batchStart = Date.now();

        context.log(`[${requestId}] Initializing batch service with config`, {
            hasBatchAccountUrl: !!process.env.BatchAccountUrl,
            hasBatchAccountName: !!process.env.BatchAccountName,
            hasBatchAccountKey: !!process.env.BatchAccountKey,
            hasPoolId: !!process.env.BatchPoolId,
            hasDefaultApplicationId: !!process.env.DefaultApplicationId,
            hasDefaultAppVersion: !!process.env.DefaultAppVersion
        });

        const batchService = new LucidSimulationJobSubmissionService({
            batchAccountUrl: process.env.BatchAccountUrl!,
            batchAccountName: process.env.BatchAccountName!,
            batchAccountKey: process.env.BatchAccountKey!,
            poolId: process.env.BatchPoolId!,
            defaultApplicationId: process.env.DefaultApplicationId,
            defaultAppVersion: process.env.DefaultAppVersion
        });

        context.log(`[${requestId}] Submitting job to batch service`, {
            documentId,
            pageId,
            userId,
            applicationId,
            appVersion
        });

        const batchResult = await batchService.submitJob(
            documentId,
            pageId,
            userId,
            applicationId,
            appVersion
        );
        metrics.batchSubmitDuration = Date.now() - batchStart;

        context.log(`[${requestId}] Batch job submission completed`, {
            duration: `${metrics.batchSubmitDuration}ms`,
            result: batchResult
        });

        // Extract jobId and taskId from batch result
        const jobIdMatch = batchResult.match(/Job '([^']+)'/);
        const taskIdMatch = batchResult.match(/task '([^']+)'/);

        const response: SuccessResponse = {
            blobUrl: documentId + "/" + blobName,
            uploadDateTime: new Date().toISOString(),
            batchJob: {
                message: batchResult,
                jobId: jobIdMatch?.[1],
                taskId: taskIdMatch?.[1]
            }
        };

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        context.log(`[${requestId}] Operation completed successfully`, {
            totalDuration: `${totalDuration}ms`,
            modelSerializationDuration: `${metrics.modelSerializationDuration}ms`,
            uploadDuration: `${metrics.uploadDuration}ms`,
            batchSubmitDuration: `${metrics.batchSubmitDuration}ms`,
            modelSize: metrics.modelSize,
            compressionRatio: metrics.compressionRatio,
            documentId,
            pageId,
            userId,
            jobId: response.batchJob.jobId,
            taskId: response.batchJob.taskId,
            blobUrl: response.blobUrl,
            performanceBreakdown: {
                modelSerialization: Math.round((metrics.modelSerializationDuration / totalDuration) * 100) + '%',
                upload: Math.round((metrics.uploadDuration / totalDuration) * 100) + '%',
                batchSubmit: Math.round((metrics.batchSubmitDuration / totalDuration) * 100) + '%',
                other: Math.round(((totalDuration - metrics.modelSerializationDuration - metrics.uploadDuration - metrics.batchSubmitDuration) / totalDuration) * 100) + '%'
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
                modelSerializationDuration: `${metrics.modelSerializationDuration}ms`,
                uploadDuration: `${metrics.uploadDuration}ms`,
                batchSubmitDuration: `${metrics.batchSubmitDuration}ms`,
                modelSize: metrics.modelSize,
                compressionRatio: metrics.compressionRatio
            }
        };

        if (error instanceof BatchConfigurationError) {
            context.log(`[${requestId}] Batch configuration error after ${errorDuration}ms:`, {
                ...errorInfo,
                configurationKey: error.configurationKey
            });

            return {
                status: 500,
                jsonBody: {
                    message: "Batch configuration error",
                    phase: "batch",
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
                batchError: error.batchError
            });

            return {
                status: 500,
                jsonBody: {
                    message: "Failed to create batch job",
                    phase: "batch",
                    details: {
                        jobId: error.jobId,
                        batchError: error.batchError,
                        message: error.message
                    }
                } as ErrorResponse
            };
        }

        context.log(`[${requestId}] Unexpected error after ${errorDuration}ms:`, errorInfo);

        return {
            status: 500,
            jsonBody: {
                message: "Unexpected error: " + (error instanceof Error ? error.message : "Unknown error"),
                phase: "unknown"
            } as ErrorResponse
        };
    }
}

app.http("saveAndSubmitSimulation", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "simulation/save-and-submit",
    handler: saveAndSubmitSimulation
});