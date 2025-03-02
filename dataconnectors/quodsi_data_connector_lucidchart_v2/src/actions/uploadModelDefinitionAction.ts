import { DataConnectorAsynchronousAction } from 'lucid-extension-sdk';
import { AzureStorageService } from "../services/azureStorageService";
import { getConfig } from "../config";

interface UploadModelRequest {
    documentId: string;  // Added to match the route parameter from the original function
    userId: string;
    pageId: string;
    model: any;
}

function getBlobName(userId: string, pageId: string): string {
    return `model_${userId}_${pageId}.json`;
}

export const uploadModelDefinitionAction: (action: DataConnectorAsynchronousAction) => Promise<{ success: boolean }> = async (
    action,
) => {
    const metrics = {
        startTime: Date.now(),
        serializationDuration: 0,
        uploadDuration: 0
    };

    console.log('[uploadModelDefinitionAction] Starting execution');

    try {
        // Extract and validate request data
        const data = action.data as UploadModelRequest;
        const { documentId, userId, pageId, model } = data;
        
        // Validate required fields
        if (!documentId || !userId || !pageId || !model) {
            console.error('[uploadModelDefinitionAction] Missing required fields', {
                hasDocumentId: !!documentId,
                hasUserId: !!userId,
                hasPageId: !!pageId,
                hasModel: !!model
            });
            return { success: false };
        }

        // Get configuration
        const config = getConfig();

        // Initialize storage service
        if (!config.azureStorageConnectionString) {
            console.error('[uploadModelDefinitionAction] Storage connection string is not configured');
            throw new Error('Storage connection string is not configured');
        }
        const storageService = new AzureStorageService(config.azureStorageConnectionString);

        // Prepare the model JSON
        const serializeStart = Date.now();
        const modelJson = JSON.stringify(model, null, 2);
        metrics.serializationDuration = Date.now() - serializeStart;

        // Upload the model
        const uploadStart = Date.now();
        const blobName = getBlobName(userId, pageId);
        
        console.log(`[uploadModelDefinitionAction] Uploading model to blob storage`, {
            documentId,
            blobName,
            modelSize: modelJson.length
        });

        const uploadSuccess = await storageService.uploadBlobContent(
            documentId,
            blobName,
            modelJson
        );
        metrics.uploadDuration = Date.now() - uploadStart;

        if (!uploadSuccess) {
            console.error('[uploadModelDefinitionAction] Failed to upload model definition');
            return { success: false };
        }

        // Log performance metrics
        const totalDuration = Date.now() - metrics.startTime;
        console.log('[uploadModelDefinitionAction] Operation completed', {
            totalDuration: `${totalDuration}ms`,
            serializationDuration: `${metrics.serializationDuration}ms`,
            uploadDuration: `${metrics.uploadDuration}ms`,
            modelSize: modelJson.length,
            blobUrl: `${documentId}/${blobName}`,
            uploadDateTime: new Date().toISOString()
        });

        return { success: true };

    } catch (error) {
        const errorDuration = Date.now() - metrics.startTime;
        console.error(`[uploadModelDefinitionAction] Error after ${errorDuration}ms:`, {
            type: error.constructor.name,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        return { success: false };
    }
};