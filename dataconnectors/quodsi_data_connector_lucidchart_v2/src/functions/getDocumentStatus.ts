// src/functions/getDocumentStatus.ts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { AzureStorageService } from "../services/azureStorageService";
import { DocumentStatusResponse, ScenarioStates, ErrorResponse, ScenarioState, RunState } from "../types/documentStatus";
import { getConfig } from "../config";

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

        // Get configuration
        const config = getConfig();

        // Initialize storage service
        if (!config.azureStorageConnectionString) {
            throw new Error('Storage connection string is not configured');
        }
        const storageService = new AzureStorageService(config.azureStorageConnectionString);

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
                // Parse the JSON data from scenarios_status.json
                const parsedData = JSON.parse(scenariosJson);
                
                // Map to our expected format, ensuring we include the new fields
                scenarios = {
                    scenarios: (parsedData.scenarios || []).map((s: any) => {
                        // Convert the scenario data to our expected ScenarioState format
                        const scenario: ScenarioState = {
                            id: s.id,
                            name: s.name,
                            runState: s.runState as RunState,
                            reps: s.reps,
                            forecastDays: s.forecastDays,
                            seed: s.seed,
                            type: s.type,
                            // Include the new fields for results tracking
                            resultsLastUpdated: s.resultsLastUpdated || null,
                            resultsLastImported: s.resultsLastImported || null,
                            resultsViewed: typeof s.resultsViewed === 'boolean' ? s.resultsViewed : false
                        };
                        return scenario;
                    }),
                    lastUpdated: parsedData.lastUpdated || new Date().toISOString()
                };
                context.log(`[${requestId}] Parsed ${scenarios.scenarios?.length ?? 0} scenarios`);
                
                // Log information about results availability
                const scenariosWithNewResults = scenarios.scenarios.filter(s => 
                    s.runState === RunState.RanSuccessfully && 
                    s.resultsLastUpdated && 
                    !s.resultsViewed
                );
                
                if (scenariosWithNewResults.length > 0) {
                    context.log(`[${requestId}] Found ${scenariosWithNewResults.length} scenarios with new results`);
                }
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