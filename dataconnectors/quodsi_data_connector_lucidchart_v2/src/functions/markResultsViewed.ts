// src/functions/markResultsViewed.ts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { AzureStorageService } from "../services/azureStorageService";
import { getConfig } from "../config";

export async function markResultsViewed(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const metrics = {
        startTime: Date.now()
    };

    const requestId = context.invocationId;
    context.log(`[${requestId}] Starting markResultsViewed`);

    try {
        // Extract and validate document ID
        const documentId = request.params.documentId;
        if (!documentId) {
            context.log(`[${requestId}] Error: Missing documentId`);
            return {
                status: 400,
                jsonBody: { message: "Document ID cannot be empty" }
            };
        }

        // Extract scenario ID from query parameters (optional)
        const scenarioId = request.query.get('scenarioId') || undefined;

        // Get configuration
        const config = getConfig();

        // Initialize storage service
        if (!config.azureStorageConnectionString) {
            throw new Error('Storage connection string is not configured');
        }
        const storageService = new AzureStorageService(config.azureStorageConnectionString);

        // Check if container exists
        const hasContainer = await storageService.containerExists(documentId);
        if (!hasContainer) {
            context.log(`[${requestId}] Error: Container ${documentId} does not exist`);
            return {
                status: 404,
                jsonBody: { message: `Document ${documentId} not found` }
            };
        }

        // Get the scenarios_status.json file
        const statusJson = await storageService.getBlobContent(documentId, "scenarios_status.json");
        if (!statusJson) {
            context.log(`[${requestId}] Error: scenarios_status.json not found for document ${documentId}`);
            return {
                status: 404,
                jsonBody: { message: "Scenarios status file not found" }
            };
        }

        // Parse the JSON
        const status = JSON.parse(statusJson);
        const currentTime = new Date().toISOString();
        let scenariosUpdated = 0;

        // Update the scenario(s)
        for (const scenario of (status.scenarios || [])) {
            // If scenarioId is provided, only update that scenario
            // Otherwise, update all scenarios that have unviewed results
            if (!scenarioId || scenario.id === scenarioId) {
                // Only update if resultsViewed is false
                if (scenario.resultsViewed === false) {
                    scenario.resultsViewed = true;
                    scenariosUpdated++;
                    context.log(`[${requestId}] Marked scenario ${scenario.id} as viewed`);
                }
            }
        }

        if (scenariosUpdated === 0) {
            context.log(`[${requestId}] No scenarios were updated`);
            return { 
                status: 200,
                jsonBody: { 
                    message: "No scenarios were updated",
                    scenariosUpdated: 0
                }
            };
        }

        // Update the lastUpdated timestamp for the whole file
        status.lastUpdated = currentTime;

        // Write back to blob storage
        await storageService.uploadBlobContent(
            documentId,
            "scenarios_status.json",
            JSON.stringify(status, null, 2)
        );

        const totalDuration = Date.now() - metrics.startTime;
        context.log(`[${requestId}] Operation completed in ${totalDuration}ms, updated ${scenariosUpdated} scenarios`);

        return { 
            status: 200,
            jsonBody: { 
                message: `Updated ${scenariosUpdated} scenarios as viewed`,
                scenariosUpdated,
                documentId,
                scenarioId: scenarioId || "ALL"
            }
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
                message: `Error marking results as viewed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        };
    }
}

app.http('markResultsViewed', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'mark-viewed/{documentId}',
    handler: markResultsViewed
});