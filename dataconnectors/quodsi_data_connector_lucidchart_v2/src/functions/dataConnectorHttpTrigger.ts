import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createDataConnector, validateLucidRequest } from '../utils/dataConnectorUtils';
import { FunctionLogger } from '../services/loggerService';

const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://lucid.app',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lucid-Signature, X-Lucid-RSA-Nonce',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
};

export async function dataConnectorHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Initialize the function logger
    const logger = new FunctionLogger('DataConnectorHttpTrigger', context);
    const requestId = context.invocationId;
    
    logger.info(`Processing request for URL "${request.url}" with method "${request.method}"`);

    // Log query parameters, if any
    if (request.query && Object.keys(request.query).length > 0) {
        logger.debug('Query parameters received:', request.query);
    }
    
    // Handle preflight OPTIONS request
    if (request.method.toUpperCase() === 'OPTIONS') {
        logger.info('Received an OPTIONS preflight request. Returning CORS headers.');
        return {
            status: 204,
            headers: corsHeaders
        };
    }

    try {
        // Process and log request headers
        logger.debug('Processing request headers');
        
        // Convert Azure Functions headers to Record<string, string | string[]>
        const headers: Record<string, string | string[]> = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });
        
        // Create validator logger for the validation step
        const validationLogger = logger.child('Validation');
        validationLogger.debug('Headers processed');
        
        // Read the request body
        validationLogger.debug('Reading request body');
        const body = await request.json();
        
        // Validate the request from Lucid
        validationLogger.info('Validating Lucid request');
        await validateLucidRequest(headers, body);
        validationLogger.info('Request validation succeeded');
        
        // Create the data connector instance
        const connectorLogger = logger.child('Connector');
        connectorLogger.debug('Creating data connector instance');
        const dataConnector = createDataConnector();
        
        // Execute the connector action
        const actionName = request.params.name || 'unknown';
        connectorLogger.info(`Executing data connector action: ${actionName}`, { 
            url: request.url,
            actionName
        });
        
        const startTime = Date.now();
        
        // Execute action
        const response = await dataConnector.runAction(
            request.url,
            headers,
            body
        );
        
        const elapsedTime = Date.now() - startTime;
        connectorLogger.info(`Action completed in ${elapsedTime}ms`, { 
            status: response.status,
            actionName,
            elapsedTimeMs: elapsedTime
        });

        // Log and return the final response
        logger.debug('Returning response', { status: response.status });
        
        return {
            status: response.status,
            jsonBody: response.body,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        logger.error('Error in data connector execution', {
            type: error.constructor.name,
            message: error.message,
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