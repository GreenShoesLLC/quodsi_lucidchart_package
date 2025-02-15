// src/functions/getDocumentStatus.ts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { AzureStorageService } from "../services/azureStorageService";
import { DocumentStatusResponse, ScenarioStates, ErrorResponse } from "../types/documentStatus";

export async function getDocumentStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const metrics = {
        startTime: Date.now(),
        containerCheckDuration: 0,
        scenariosReadDuration: 0
    };

    const requestId = context.invocationId;
    context.log(`[${requestId}] Starting getDocumentStatus`);

    try {
        // Extract and validate document ID
        const documentId = request.params.documentId;
        if (!documentId) {
            context.log(`[${requestId}] Error: Missing documentId`);
            return {
                status: 400,
                jsonBody: { message: "Document ID cannot be empty" } as ErrorResponse
            };
        }

        // Initialize storage service
        const connectionString = process.env.AzureStorageConnectionString;
        if (!connectionString) {
            throw new Error('Storage connection string is not configured');
        }
        const storageService = new AzureStorageService(connectionString);

        // Start both operations concurrently
        const startTime = Date.now();
        const [hasContainer, scenariosJson] = await Promise.all([
            storageService.containerExists(documentId),
            storageService.getBlobContent(documentId, "scenarios_status.json")
        ]);
        const endTime = Date.now();

        // Process results
        let scenarios: ScenarioStates = { scenarios: [] };

        if (hasContainer && scenariosJson) {
            try {
                scenarios = JSON.parse(scenariosJson);
                context.log(`[${requestId}] Parsed ${scenarios.scenarios?.length ?? 0} scenarios`);
            } catch (parseError) {
                context.log(`[${requestId}] Error parsing scenarios JSON:`, {
                    error: parseError.message,
                    json: scenariosJson.substring(0, 100) + '...' // Log start of JSON for debugging
                });
            }
        }

        const response: DocumentStatusResponse = {
            hasContainer,
            scenarios,
            statusDateTime: new Date().toISOString()
        };

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        context.log(`[${requestId}] Operation completed`, {
            totalDuration: `${totalDuration}ms`,
            blobOperationsDuration: `${endTime - startTime}ms`,
            scenarioCount: scenarios.scenarios?.length ?? 0,
            responseSize: JSON.stringify(response).length
        });

        return {
            status: 200,
            jsonBody: response
        };
    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        context.log(`[${requestId}] Error after ${errorDuration}ms:`, {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack
        });

        return {
            status: 500,
            jsonBody: {
                message: `Error retrieving document status: ${error instanceof Error ? error.message : 'Unknown error'}`
            } as ErrorResponse
        };
    }
}

app.http('getDocumentStatus', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'status/{documentId}',
    handler: getDocumentStatus
});