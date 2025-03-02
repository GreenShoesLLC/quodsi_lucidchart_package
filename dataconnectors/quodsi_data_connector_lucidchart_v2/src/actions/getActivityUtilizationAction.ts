// actions/getActivityUtilizationAction.ts
import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { createLucidApiService } from '../services/lucidApi';
import { getConfig } from '../config';

export const getActivityUtilizationAction: (action: DataConnectorAsynchronousAction) => Promise<{ status: number; json: { csvData: string } }> = async (
    action,
) => {
    try {
        // Type assertion to ensure action.data has the expected structure
        const data = action.data as { documentId: string, userId: string };

        // Extract data from action
        const { documentId, userId } = data;
        const authToken = action.context.userCredential;

        // Log for debugging
        console.log(`[getActivityUtilizationAction] Fetching activity utilization for document ID: ${documentId}`);

        // Get configuration
        const config = getConfig();
        // Create LucidApiService instance
        const baseUrl = config.apiBaseUrl;
        const lucidApiService = createLucidApiService(baseUrl);

        // Get the CSV blob
        const csvText = await lucidApiService.getActivityUtilization(documentId, userId);

        console.log("[getActivityUtilizationAction] Successfully retrieved activity utilization data");
        return {
            status: 200,
            json: {
                csvData: csvText
            }
        };

    } catch (error) {
        console.error("[getActivityUtilizationAction] Error fetching activity utilization:", error);
        return {
            status: 500,
            json: {
                csvData: '',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        };
    }
};