import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { createLucidApiService } from '@quodsi/shared';
import { getConfig } from '../config';

export const simulateAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    try {
        // Type assertion to ensure action.data has the expected structure
        const data = action.data as { documentId: string, pageId: string, userId: string };

        // Extract data from action
        const { documentId, pageId, userId } = data;
        const authToken = action.context.userCredential;

        // Log the document ID for debugging purposes
        console.log(`[simulateAction] Simulate action triggered for document ID: ${documentId} with package ID: ${action.context.packageId}`);

        // Get configuration
        const config = getConfig();
        // Create LucidApiService instance
        const baseUrl = config.apiBaseUrl;
        const lucidApiService = createLucidApiService(baseUrl);

        // Call the simulate endpoint using our service
        const success = await lucidApiService.simulateDocument(
            documentId,
            pageId,
            userId,
            authToken
        );

        console.log(success ? "[simulateAction] Simulate action successfully triggered." : "Simulate action failed.");
        return { success };

    } catch (error) {
        console.error("[simulateAction] Error executing simulate action:", error);
        return { success: false };
    }
};