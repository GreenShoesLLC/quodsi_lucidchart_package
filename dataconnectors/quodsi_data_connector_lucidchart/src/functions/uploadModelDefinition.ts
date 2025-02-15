// src/functions/uploadModelDefinition.ts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { AzureStorageService } from "../services/azureStorageService";

interface UploadModelRequest {
    userId: string;
    pageId: string;
    model: any; // We could make this more specific if you have model type definitions
}

interface ErrorResponse {
    message: string;
}

interface SuccessResponse {
    blobUrl: string;
    uploadDateTime: string;
}

function getBlobName(userId: string, pageId: string): string {
    return `model_${userId}_${pageId}.json`;
}

export async function uploadModelDefinition(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const metrics = {
        startTime: Date.now(),
        serializationDuration: 0,
        uploadDuration: 0,
        modelSize: 0,
        compressionRatio: 0
    };

    const requestId = context.invocationId;
    context.log(`[${requestId}] Starting uploadModelDefinition`);

    try {
        // Extract and validate document ID from route
        const documentId = request.params.documentId;
        context.log(`[${requestId}] Attempting to process request for documentId: ${documentId}`);
        
        if (!documentId) {
            context.log(`[${requestId}] Error: Missing documentId in route parameters`, {
                params: request.params,
                url: request.url
            });
            return {
                status: 400,
                jsonBody: { message: "Document ID cannot be empty" } as ErrorResponse
            };
        }

        // Log request headers for debugging
        context.log(`[${requestId}] Request headers:`, {
            contentType: request.headers.get('content-type'),
            contentLength: request.headers.get('content-length'),
            authorization: request.headers.has('authorization') ? 'Present' : 'Missing'
        });

        // Parse and validate request body
        context.log(`[${requestId}] Attempting to parse request body`);
        const requestBody = await request.json() as UploadModelRequest;
        const { userId, pageId, model } = requestBody;
        
        // Log validation check results
        context.log(`[${requestId}] Request body validation:`, {
            hasUserId: !!userId,
            hasPageId: !!pageId,
            hasModel: !!model,
            modelType: model ? typeof model : 'undefined',
            modelKeys: model ? Object.keys(model) : []
        });
        
        if (!userId || !pageId || !model) {
            context.log(`[${requestId}] Error: Missing required fields in request body`, {
                missingFields: {
                    userId: !userId,
                    pageId: !pageId,
                    model: !model
                }
            });
            return {
                status: 400,
                jsonBody: { message: "Missing required fields: userId, pageId, or model" } as ErrorResponse
            };
        }

        // Initialize storage service
        const connectionString = process.env.AzureStorageConnectionString;
        if (!connectionString) {
            context.log(`[${requestId}] Error: Storage connection string not configured`);
            throw new Error('Storage connection string is not configured');
        }

        context.log(`[${requestId}] Initializing AzureStorageService`);
        const storageService = new AzureStorageService(connectionString);

        // Prepare the model JSON
        context.log(`[${requestId}] Starting model serialization`);
        const serializeStart = Date.now();
        const modelJson = JSON.stringify(model, null, 2);
        metrics.serializationDuration = Date.now() - serializeStart;
        metrics.modelSize = modelJson.length;
        
        // Calculate compression ratio if original model is available
        const originalSize = JSON.stringify(model).length;
        metrics.compressionRatio = originalSize ? (modelJson.length / originalSize) : 1;

        context.log(`[${requestId}] Model serialization completed`, {
            serializationDuration: `${metrics.serializationDuration}ms`,
            modelSize: metrics.modelSize,
            compressionRatio: metrics.compressionRatio
        });

        // Upload the model
        const uploadStart = Date.now();
        const blobName = getBlobName(userId, pageId);
        
        context.log(`[${requestId}] Starting blob upload`, {
            blobName,
            containerName: documentId,
            contentLength: modelJson.length
        });

        const uploadSuccess = await storageService.uploadBlobContent(
            documentId,
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
                jsonBody: { message: "Failed to upload model definition" } as ErrorResponse
            };
        }

        const response: SuccessResponse = {
            blobUrl: `${documentId}/${blobName}`,
            uploadDateTime: new Date().toISOString()
        };

        // Log final performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        context.log(`[${requestId}] Operation completed successfully`, {
            totalDuration: `${totalDuration}ms`,
            serializationDuration: `${metrics.serializationDuration}ms`,
            uploadDuration: `${metrics.uploadDuration}ms`,
            modelSize: metrics.modelSize,
            compressionRatio: metrics.compressionRatio,
            blobName,
            blobUrl: response.blobUrl,
            performanceBreakdown: {
                serialization: Math.round((metrics.serializationDuration / totalDuration) * 100) + '%',
                upload: Math.round((metrics.uploadDuration / totalDuration) * 100) + '%',
                other: Math.round(((totalDuration - metrics.serializationDuration - metrics.uploadDuration) / totalDuration) * 100) + '%'
            }
        });

        return {
            status: 200,
            jsonBody: response
        };
    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        
        // Enhanced error logging
        context.log(`[${requestId}] Error in uploadModelDefinition after ${errorDuration}ms:`, {
            errorType: error.constructor.name,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            metrics: {
                totalDuration: `${errorDuration}ms`,
                serializationDuration: `${metrics.serializationDuration}ms`,
                uploadDuration: `${metrics.uploadDuration}ms`,
                modelSize: metrics.modelSize,
                compressionRatio: metrics.compressionRatio
            },
            requestParams: {
                documentId: request.params.documentId
            }
        });

        return {
            status: 500,
            jsonBody: {
                message: `Error uploading model definition: ${error instanceof Error ? error.message : 'Unknown error'}`
            } as ErrorResponse
        };
    }
}

app.http('uploadModelDefinition', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'model/{documentId}',
    handler: uploadModelDefinition
});