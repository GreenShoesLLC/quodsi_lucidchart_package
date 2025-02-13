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
    context.log(`Data connector function processed request for url "${request.url}" with method "${request.method}"`);

    // Log query parameters, if any.
    if (request.query && Object.keys(request.query).length > 0) {
        context.log('Query parameters received:', request.query);
    }
    // Handle preflight OPTIONS request
    if (request.method.toUpperCase() === 'OPTIONS') {
        context.log('Received an OPTIONS preflight request. Returning CORS headers.');
        return {
            status: 204,
            headers: corsHeaders
        };
    }

    try {
        // Process and log request headers.
        context.log('Processing request headers.');
        // Convert Azure Functions headers to Record<string, string | string[]>
        const headers: Record<string, string | string[]> = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });
        context.log('Converted headers:', headers);
        // Read and log the request body.
        context.log('Attempting to read the request body.');
        // Get request body once
        const body = await request.json();
        context.log('Request body received:', body);
        // Validate the request from Lucid.
        context.log('Validating Lucid request with provided headers and body.');
        await validateLucidRequest(headers, body);
        context.log('Request validation succeeded.');
        // Create the data connector instance.
        context.log('Creating data connector instance.');
        const dataConnector = createDataConnector();
        // Log before executing the connector action.
        context.log('Executing data connector action.', { url: request.url, headers, body });
        const startTime = Date.now();
        // Execute action
        const response = await dataConnector.runAction(
            request.url,
            headers,
            body
        );
        const elapsedTime = Date.now() - startTime;
        context.log(`Data connector action executed in ${elapsedTime} ms. Response status: ${response.status}`);

        // Log and return the final response.
        context.log('Returning response from data connector action.');
        return {
            status: response.status,
            jsonBody: response.body,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        context.error('Error in data connector action:', error);
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