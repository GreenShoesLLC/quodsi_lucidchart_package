// src/services/collectionUpdateService.ts
import { SerializedFields, DataConnectorAsynchronousAction } from "lucid-extension-sdk";
import { conditionalLog, conditionalError } from '../utils/loggingUtils';

// Types
export interface CollectionUpdate {
    schema: any;
    patch: {
        items: Map<string, SerializedFields>;
    };
}

export interface CollectionsUpdate {
    [key: string]: CollectionUpdate;
}

/**
 * Sends collection updates to Lucid
 * @param action The asynchronous action context
 * @param updates Collection updates to send
 * @param dataSourceName Name of the data source to update
 * @param verbose Whether to log verbose output
 * @returns Promise resolving with success status
 */
export async function sendCollectionUpdates(
    action: DataConnectorAsynchronousAction,
    updates: CollectionsUpdate,
    dataSourceName: string = "simulation_results",
    verbose: boolean = true
): Promise<{ success: boolean }> {
    try {
        conditionalLog("=== Sending Updates to Lucid ===", verbose);
        await action.client.update({
            dataSourceName,
            collections: updates
        });
        conditionalLog("=== Updates Sent Successfully ===", verbose);
        return { success: true };
    } catch (error) {
        conditionalError("Error sending updates to Lucid:", error);
        throw error;
    }
}
