// utils/contextHelper.ts
import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { isString } from 'lucid-extension-sdk/core/checks';

interface RequiredActionContext {
    documentId: string;
    userId: string;
    pageId: string;
}

export function getRequiredContext(action: DataConnectorAsynchronousAction): RequiredActionContext | null {
    console.log("Getting required context for action:", action.name);

    // For import action, data is passed directly
    if (action.name === 'ImportSimulationResults') {
        const data = action.data as { documentId: string; userId: string; pageId: string };
        if (!data.documentId || !data.userId || !data.pageId) {
            throw new Error('Import action requires documentId, userId, and pageId in action.data');
        }
        return {
            documentId: data.documentId,
            userId: data.userId,
            pageId: data.pageId
        };
    }

    // Log all available collections and context
    console.log("Action context:", {
        collections: Object.keys(action.context.documentCollections || {})
    });

    // Get the pageId from Models collection
    const modelData = action.context.documentCollections?.['Models'] || [];
    console.log("Model data found:", modelData);

    if (modelData.length === 0) {
        console.log("No Models data found in document collections");
        return null;
    }

    try {
        // The stored value should be a quoted pageId string
        const pageId = JSON.parse(modelData[0]);

        // Try to get documentId and userId from context
        const documentId = 'b8728c9a-beb3-4ea2-9689-0f13843a6e8c' //action.context.documentId;
        const userId = '202149326' //action.context.userId;

        if (!documentId || !userId) {
            console.log("Missing required context:", { documentId, userId });
            return null;
        }

        const context = {
            documentId,
            userId,
            pageId
        };

        console.log("Retrieved context:", context);
        return context;

    } catch (error) {
        console.error('Error parsing model data:', error);
        return null;
    }
}

// Helper function to extract page IDs from collections
export function getExistingPageIds(collections: Record<string, string[]>): string[] {
    const modelData = collections['Models'] || [];
    return modelData
        .map(id => {
            try {
                return JSON.parse(id);
            } catch {
                return null;
            }
        })
        .filter(isString);
}