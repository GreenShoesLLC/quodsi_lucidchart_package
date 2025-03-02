import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createDataConnector, validateLucidRequest } from '../utils/dataConnectorUtils';

const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://lucid.app',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lucid-Signature, X-Lucid-RSA-Nonce',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
};

export async function dataConnectorHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Use direct context.log calls for Azure Functions visibility
    const requestId = context.invocationId;

    context.log(`[${requestId}] Processing request for URL "${request.url}" with method "${request.method}"`);

    // Log query parameters, if any
    if (request.query && Object.keys(request.query).length > 0) {
        context.log(`[${requestId}] Query parameters received:`, request.query);
    }

    // Handle preflight OPTIONS request
    if (request.method.toUpperCase() === 'OPTIONS') {
        context.log(`[${requestId}] Received an OPTIONS preflight request. Returning CORS headers.`);
        return {
            status: 204,
            headers: corsHeaders
        };
    }

    try {
        // Process and log request headers
        context.log(`[${requestId}] Processing request headers`);

        // Convert Azure Functions headers to Record<string, string | string[]>
        const headers: Record<string, string | string[]> = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });

        context.log(`[${requestId}] Headers processed`);

        // Read the request body
        context.log(`[${requestId}] Reading request body`);
        const body = await request.json();

        // Validate the request from Lucid
        context.log(`[${requestId}] Validating Lucid request`);
        await validateLucidRequest(headers, body);
        context.log(`[${requestId}] Request validation succeeded`);

        // Create the data connector instance
        context.log(`[${requestId}] Creating data connector instance`);
        const dataConnector = createDataConnector();

        // Execute the connector action
        const actionName = request.params.name || 'unknown';
        context.log(`[${requestId}] Executing data connector action: ${actionName}`, {
            url: request.url,
            actionName
        });

        const startTime = Date.now();

        // Execute action
        context.log(`[${requestId}] About to run action`);
        const response = await dataConnector.runAction(
            request.url,
            headers,
            body
        );

        const elapsedTime = Date.now() - startTime;
        context.log(`[${requestId}] Action completed in ${elapsedTime}ms`, {
            status: response.status,
            actionName,
            elapsedTimeMs: elapsedTime
        });

        // Log and return the final response
        context.log(`[${requestId}] Returning response`, { status: response.status });

        return {
            status: response.status,
            jsonBody: response.body,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        context.error(`[${requestId}] Error in data connector execution: ${error.message}`, {
            type: error.constructor.name,
            stack: error.stack
        });

        return {
            status: 500,
            jsonBody: { error: error.message },
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        };
    }
}

app.http('dataConnector', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'dataConnector/{name}', // matches /api/dataConnector/someValue
    handler: dataConnectorHttpTrigger
});