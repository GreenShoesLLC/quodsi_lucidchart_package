import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { createLucidApiService } from '../services/lucidApi';
import { getConfig } from '../config';

export const simulateAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    console.log('[simulateAction] Starting simulateAction execution.');
    try {
        // Log the complete action received.
        console.log('[simulateAction] Received action:', action);

        // Perform a type assertion to ensure action.data has the expected structure.
        console.log('[simulateAction] Attempting type assertion on action.data.');
        const data = action.data as { documentId: string, scenarioId: string };
        console.log('[simulateAction] Type assertion successful. Data extracted:', data);
        // Extract data from action
        const { documentId, scenarioId } = data;
        const authToken = action.context.userCredential;
        console.log(
            `[simulateAction] Extracted documentId: ${documentId}, scenarioId: ${scenarioId}`
        );
        // Log only the length of the auth token for security.
        console.log(
            `[simulateAction] Retrieved authToken (length: ${authToken ? authToken.length : 'undefined'})`
        );

        // Log the package ID and notify that the simulate action was triggered.
        console.log(
            `[simulateAction] Simulate action triggered for document ID: ${documentId} with package ID: ${action.context.packageId}`
        );

        // Retrieve configuration settings.
        console.log('[simulateAction] Retrieving configuration.');
        const config = getConfig();
        console.log('[simulateAction] Configuration retrieved:', config);
        // Create LucidApiService instance
        const baseUrl = config.apiBaseUrl;
        console.log(`[simulateAction] Creating LucidApiService with baseUrl: ${baseUrl}`);
        const lucidApiService = createLucidApiService(baseUrl);
        console.log('[simulateAction] LucidApiService instance created.');
        // Log details before calling the simulate endpoint.
        console.log('[simulateAction] Preparing to call simulateDocument endpoint with parameters:', {
            documentId,
            scenarioId,
            authToken: authToken ? 'Provided' : 'Not Provided'
        });
        // Call the simulate endpoint using our service
        const success = await lucidApiService.simulateDocument(
            documentId,
            scenarioId,
            authToken
        );

        // Log the outcome of the simulateDocument call.
        console.log(`[simulateAction] simulateDocument response received: ${success}`);
        console.log(
            success
                ? "[simulateAction] Simulate action successfully triggered."
                : "[simulateAction] Simulate action failed."
        );

        console.log('[simulateAction] Exiting simulateAction execution.');
        return { success };

    } catch (error) {
        console.error("[simulateAction] Error executing simulate action:", error);
        return { success: false };
    }
};