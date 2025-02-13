import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * HTTP triggered function that returns a greeting message.
 * Logs extensive details about the incoming request for debugging.
 *
 * @param {HttpRequest} request - The incoming HTTP request.
 * @param {InvocationContext} context - The function context used for logging.
 * @returns {Promise<HttpResponseInit>} - The HTTP response containing a greeting.
 */
export async function httpTrigger1(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Log the URL of the incoming request.
    context.log(`[httpTrigger1] Request received for URL: "${request.url}"`);

    // Log the HTTP method used.
    context.log(`[httpTrigger1] HTTP Method: "${request.method}"`);

    // Log request headers.
    context.log(`[httpTrigger1] Request Headers: ${JSON.stringify(request.headers)}`);

    // Log query parameters if available.
    if (request.query) {
        // Convert query parameters to a serializable format.
        const queryParams = JSON.stringify(Array.from(request.query.entries()));
        context.log(`[httpTrigger1] Query Parameters: ${queryParams}`);
    } else {
        context.log("[httpTrigger1] No query parameters found.");
    }

    // Attempt to retrieve the 'name' value from the query string or the request body.
    let name: string | undefined;

    // Try to get the 'name' parameter from the query string.
    try {
        name = request.query.get('name') || undefined;
        if (name) {
            context.log(`[httpTrigger1] Retrieved 'name' from query parameters: "${name}"`);
        } else {
            context.log("[httpTrigger1] 'name' query parameter not found.");
        }
    } catch (error) {
        context.error("[httpTrigger1] Error retrieving 'name' from query parameters:", error);
    }

    // If 'name' is not in the query string, try to read it from the request body.
    if (!name) {
        try {
            const requestBody = await request.text();
            context.log(`[httpTrigger1] Request body received: "${requestBody}"`);
            if (requestBody && requestBody.trim().length > 0) {
                name = requestBody.trim();
                context.log(`[httpTrigger1] Using request body as name: "${name}"`);
            } else {
                context.log("[httpTrigger1] Request body is empty or contains only whitespace.");
            }
        } catch (error) {
            context.error("[httpTrigger1] Error reading request body text:", error);
        }
    }

    // If 'name' is still undefined, use the default value.
    if (!name) {
        name = 'world';
        context.log(`[httpTrigger1] No 'name' provided. Defaulting to: "${name}"`);
    }

    // Prepare the response message.
    const responseMessage = `Hello, ${name}!`;
    context.log(`[httpTrigger1] Response message prepared: "${responseMessage}"`);

    // Create the HTTP response object.
    const response: HttpResponseInit = { body: responseMessage };

    // Log the final response object before returning.
    context.log(`[httpTrigger1] Sending response: ${JSON.stringify(response)}`);

    return response;
};

// Register the HTTP trigger with the Azure Functions runtime.
app.http('httpTrigger1', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'greetings', // Now accessible via /api/greetings
    handler: httpTrigger1
});
